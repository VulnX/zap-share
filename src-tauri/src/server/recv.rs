use crate::{api, models};
use actix_web::http::header;
use actix_web::web::BytesMut;
use actix_web::{http::StatusCode, web, HttpRequest, HttpResponse, Responder};
use futures_util::StreamExt;
use log::{debug, error, info};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, Manager, Window};
use tokio::fs;
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::sync::oneshot;

pub struct TransferManager {
    pub pending: Mutex<HashMap<String, oneshot::Sender<bool>>>,
    pub tokens: Mutex<HashSet<String>>,
}

impl TransferManager {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
            tokens: Mutex::new(HashSet::new()),
        }
    }
}

/// Handles `GET /upload`
///
/// Serves the upload UI HTML page.
pub async fn serve_upload_ui() -> impl Responder {
    let mode = api::TRANSFER_MODE.read().unwrap();
    let mode = mode.as_ref().unwrap();
    if matches!(mode, models::TransferMode::Send(_)) {
        return HttpResponse::Found()
            .append_header((header::LOCATION, "/"))
            .finish();
    }

    HttpResponse::Ok().body(include_str!("../static/upload-portal.html"))
}

/// Handles `POST /upload/request` — TEXT only.
///
/// Used when the sender wants to transfer a text snippet.
/// For file transfers use `POST /upload/request-batch` instead.
pub async fn handle_request(
    window: web::Data<Window>,
    manager: web::Data<TransferManager>,
    req: web::Json<models::TransferRequest>,
) -> impl Responder {
    let mode_guard = api::TRANSFER_MODE.read().unwrap();
    let mode = mode_guard.as_ref().unwrap();
    if matches!(mode, models::TransferMode::Send(_)) {
        return HttpResponse::Forbidden().body("Forbidden");
    }
    drop(mode_guard);

    let request_id = req.id.clone();
    debug!("Incoming text transfer request: {:#?}", req);

    let (tx, rx) = oneshot::channel();
    {
        let mut pending = manager.pending.lock().unwrap();
        pending.insert(request_id.clone(), tx);
    }

    if let Err(e) = window.emit("transfer-request", req.into_inner()) {
        error!("Failed to emit transfer-request: {e}");
        return HttpResponse::InternalServerError().body("Failed to notify receiver");
    }

    match tokio::time::timeout(std::time::Duration::from_secs(60), rx).await {
        Ok(Ok(accepted)) => {
            if accepted {
                let token = uuid::Uuid::new_v4().to_string();
                {
                    let mut tokens = manager.tokens.lock().unwrap();
                    tokens.insert(token.clone());
                }
                HttpResponse::Ok().json(models::TransferResponse {
                    id: request_id,
                    accepted: true,
                    token: Some(token),
                })
            } else {
                HttpResponse::Ok().json(models::TransferResponse {
                    id: request_id,
                    accepted: false,
                    token: None,
                })
            }
        }
        _ => {
            let mut pending = manager.pending.lock().unwrap();
            pending.remove(&request_id);
            HttpResponse::RequestTimeout().body("Request timed out or cancelled")
        }
    }
}

/// Handles `POST /upload/request-batch` — FILES.
///
/// Accepts metadata for all files in a single request, emits one
/// `transfer-request-batch` event to the UI, waits for the user to
/// accept/reject, then returns a token for **each** file on acceptance.
pub async fn handle_batch_request(
    window: web::Data<Window>,
    manager: web::Data<TransferManager>,
    req: web::Json<models::BatchTransferRequest>,
) -> impl Responder {
    let mode_guard = api::TRANSFER_MODE.read().unwrap();
    let mode = mode_guard.as_ref().unwrap();
    if matches!(mode, models::TransferMode::Send(_)) {
        return HttpResponse::Forbidden().body("Forbidden");
    }
    drop(mode_guard);

    let batch_id = req.batch_id.clone();
    let file_ids: Vec<String> = req.files.iter().map(|f| f.id.clone()).collect();
    debug!("Incoming batch transfer request id={batch_id} files={}", file_ids.len());

    let (tx, rx) = oneshot::channel();
    {
        let mut pending = manager.pending.lock().unwrap();
        pending.insert(batch_id.clone(), tx);
    }

    if let Err(e) = window.emit("transfer-request-batch", req.into_inner()) {
        error!("Failed to emit transfer-request-batch: {e}");
        return HttpResponse::InternalServerError().body("Failed to notify receiver");
    }

    match tokio::time::timeout(std::time::Duration::from_secs(60), rx).await {
        Ok(Ok(accepted)) => {
            if accepted {
                let tokens: Vec<String> = file_ids
                    .iter()
                    .map(|_| uuid::Uuid::new_v4().to_string())
                    .collect();
                {
                    let mut tok_guard = manager.tokens.lock().unwrap();
                    for t in &tokens {
                        tok_guard.insert(t.clone());
                    }
                }
                debug!("Batch accepted; issued {} tokens", tokens.len());
                HttpResponse::Ok().json(models::BatchTransferResponse {
                    batch_id,
                    accepted: true,
                    tokens,
                })
            } else {
                debug!("Batch rejected for batch_id={batch_id}");
                HttpResponse::Ok().json(models::BatchTransferResponse {
                    batch_id,
                    accepted: false,
                    tokens: vec![],
                })
            }
        }
        _ => {
            let mut pending = manager.pending.lock().unwrap();
            pending.remove(&batch_id);
            HttpResponse::RequestTimeout().body("Request timed out or cancelled")
        }
    }
}


/// Handles `POST /upload/files`
///
/// Streams the raw request body directly to disk chunk-by-chunk.
/// The filename is read from the `X-Filename` request header.
/// The total size (for progress reporting) is read from the
/// `Content-Length` request header when present.
///
/// Emits a `progress-update` event to the window after writing each chunk,
/// with the following payload:
/// ```javascript
/// { "id": String, "filename": String, "progress": Number /* 0-100 */ }
/// ```
///
/// Returns `201 Created` on success, `400 Bad Request` if the
/// `X-Filename` header is missing or empty.
///
/// # Notes
/// - Body is streamed (not buffered) – no multipart overhead.
/// - If a file with the same name already exists in the downloads directory
///   a numeric suffix is appended automatically, e.g. `photo (1).jpg`.
pub async fn receive_file(
    window: web::Data<Window>,
    manager: web::Data<TransferManager>,
    req: HttpRequest,
    mut body: web::Payload,
) -> impl Responder {
    let mode_guard = api::TRANSFER_MODE.read().unwrap();
    let mode = mode_guard.as_ref().unwrap();
    if matches!(mode, models::TransferMode::Send(_)) {
        return HttpResponse::Forbidden().body("Forbidden");
    }

    // This is a blocking request, drop the `TRANSFER_MODE` guard
    drop(mode_guard);

    // Validate token
    let token = match req
        .headers()
        .get("X-Transfer-Token")
        .and_then(|v| v.to_str().ok())
    {
        Some(token) => {
            debug!("Received upload attempt with token: {token}");
            token
        }
        None => {
            return HttpResponse::Unauthorized().body("Missing X-Transfer-Token header");
        }
    };

    {
        let mut tokens = manager.tokens.lock().unwrap();
        if !tokens.remove(token) {
            debug!("Token validation failed for: {token}");
            return HttpResponse::Forbidden().body("Invalid or expired token");
        }
        debug!("Token {token} validated and consumed");
    }

    // Extract filename from the X-Filename header (percent-decoded)
    let filename = match req
        .headers()
        .get("X-Filename")
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.is_empty())
        .map(|s| {
            urlencoding::decode(s)
                .map(|c| c.into_owned())
                .unwrap_or_else(|_| s.to_owned())
        }) {
        Some(name) => name,
        None => {
            return HttpResponse::BadRequest().body("Missing or empty X-Filename header");
        }
    };

    // Optional Content-Length for progress reporting
    let filesize: Option<u64> = req
        .headers()
        .get("Content-Length")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok());
    debug!("Content-Length header parsed as: {:?}", filesize);

    // Sanitize filename to prevent path traversal and OS-specific invalid chars (/, \, :)
    // TOOD: Is this sanitization *really* needed?
    let sanitized_filename = filename.replace(['/', '\\', ':'], "_");

    debug!("Receiving file: {sanitized_filename:#?} (size hint: {filesize:#?})");

    // Resolve the downloads directory (Android fallback)
    let mut write_path = match tauri_plugin_os::platform() {
        "android" => PathBuf::from("/storage/emulated/0/Download"),
        _ => window
            .path()
            .download_dir()
            .unwrap_or_else(|_| PathBuf::from(".")),
    };

    get_unique_file_path(&mut write_path, &sanitized_filename);

    let file = match fs::File::create(&write_path).await {
        Ok(f) => f,
        Err(e) => {
            error!("Failed to create file: {e:#?}");
            return HttpResponse::InternalServerError().body(format!("Failed to create file: {e}"));
        }
    };
    info!("Saving file to {write_path:#?}");

    let mut bufwriter = BufWriter::new(file);
    let mut written: u64 = 0;
    let term_flag = api::TERM_FLAG.read().unwrap().clone();
    let mut payload = models::ProgressUpdatePayload {
        id: uuid::Uuid::new_v4().to_string(),
        filename: sanitized_filename,
        progress: 0.0,
    };
    while let Some(chunk_result) = body.next().await {
        if let Some(ref flag) = term_flag {
            if flag.load(std::sync::atomic::Ordering::Relaxed) {
                info!("Termination signal received, stopping receive_file");
                return HttpResponse::InternalServerError()
                    .body("Transfer terminated by server reset");
            }
        }
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(e) => {
                error!("Error reading body chunk: {e:#?}");
                return HttpResponse::InternalServerError()
                    .body(format!("Transfer interrupted: {e}"));
            }
        };

        if let Err(e) = bufwriter.write_all(&chunk).await {
            error!("Failed to write chunk: {e:#?}");
            return HttpResponse::InternalServerError()
                .body(format!("Failed to write to disk: {e}"));
        }
        written += chunk.len() as u64;

        if let Some(total) = filesize {
            let new_progress = written as f32 * 100.0 / total as f32;
            let rounded = (new_progress * 10.0).round() / 10.0;
            if payload.progress < rounded {
                payload.progress = rounded;
                let _ = window.emit("progress-update", &payload);
            }
        }
    }

    if let Err(e) = bufwriter.flush().await {
        error!("Failed to flush file: {e:#?}");
        return HttpResponse::InternalServerError().body(format!("Failed to finalize file: {e}"));
    }
    info!("File saved to disk");

    HttpResponse::new(StatusCode::CREATED)
}

fn get_unique_file_path(write_path: &mut PathBuf, filename: &str) {
    debug!(
        "Resolving unique file path for: {} in {:?}",
        filename, write_path
    );
    if !write_path.join(filename).exists() {
        write_path.push(filename);
        debug!("Target path is unique: {:?}", write_path);
        return;
    }

    let (name, ext) = match filename.rsplit_once('.') {
        Some((name, ext)) => (name.to_string(), Some(ext.to_string())),
        None => (filename.to_string(), None),
    };

    for i in 1.. {
        let new_name = match &ext {
            Some(ext) => format!("{name} ({i}).{ext}"),
            None => format!("{name} ({i})"),
        };
        if !write_path.join(&new_name).exists() {
            write_path.push(new_name);
            debug!("Selected unique index-appended path: {:?}", write_path);
            return;
        }
    }
    unreachable!("Infinite loop should always find a unique name");
}

/// Handles `POST /upload/text` in ReceiveText mode
///
/// Buffers the plain-text request body and emits it as a
/// `received-text` event to the Tauri window.
///
/// Returns `204 No Content` on success.
pub async fn receive_text(
    window: web::Data<Window>,
    manager: web::Data<TransferManager>,
    req: HttpRequest,
    mut body: web::Payload,
) -> impl Responder {
    // Validate token
    let token = match req
        .headers()
        .get("X-Transfer-Token")
        .and_then(|v| v.to_str().ok())
    {
        Some(token) => token,
        None => {
            return HttpResponse::Unauthorized().body("Missing X-Transfer-Token header");
        }
    };

    {
        let mut tokens = manager.tokens.lock().unwrap();
        if !tokens.remove(token) {
            return HttpResponse::Forbidden().body("Invalid or expired token");
        }
    }

    let term_flag = api::TERM_FLAG.read().unwrap().clone();
    let mut body_bytes = BytesMut::new();
    while let Some(chunk_result) = body.next().await {
        if let Some(ref flag) = term_flag {
            if flag.load(std::sync::atomic::Ordering::Relaxed) {
                info!("Termination signal received, stopping receive_text");
                return HttpResponse::InternalServerError()
                    .body("Transfer terminated by server reset");
            }
        }
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(e) => return HttpResponse::InternalServerError().body(e.to_string()),
        };
        body_bytes.extend_from_slice(&chunk);
    }
    let body_str = String::from_utf8_lossy(&body_bytes).to_string();
    window.emit("received-text", body_str).unwrap();
    HttpResponse::new(StatusCode::NO_CONTENT)
}
