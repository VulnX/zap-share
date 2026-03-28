use std::path::PathBuf;

use actix_web::{
    http::StatusCode,
    web::{self, BytesMut},
    HttpRequest, HttpResponse, Responder,
};
use futures_util::StreamExt;
use log::debug;
use tauri::{Emitter, Manager, Window};
use tokio::{
    fs,
    io::{AsyncWriteExt, BufWriter},
};

use crate::models;

/// Handles `GET /` in ReceiveFile mode
///
/// Serves the upload UI HTML page.
pub async fn serve_upload_ui() -> impl Responder {
    HttpResponse::Ok().body(include_str!("../static/upload-file.html"))
}

/// Handles `POST /files` in ReceiveFile mode
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
    req: HttpRequest,
    mut body: web::Payload,
) -> impl Responder {
    // Extract filename from the X-Filename header (percent-decoded)
    let filename = match req
        .headers()
        .get("X-Filename")
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.is_empty())
        .map(|s| urlencoding::decode(s).map(|c| c.into_owned()).unwrap_or_else(|_| s.to_owned()))
    {
        Some(name) => name,
        None => {
            return HttpResponse::BadRequest()
                .body("Missing or empty X-Filename header");
        }
    };

    // Optional Content-Length for progress reporting
    let filesize: Option<u64> = req
        .headers()
        .get("Content-Length")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok());

    // Sanitize filename to prevent path traversal and OS-specific invalid chars (/, \, :)
    let sanitized_filename = filename.replace(['/', '\\', ':'], "_");

    debug!("Receiving file: {sanitized_filename:#?} (size hint: {filesize:#?})");

    // Resolve the downloads directory (Android fallback)
    let mut write_path = match tauri_plugin_os::platform() {
        "android" => PathBuf::from("/storage/emulated/0/Download"),
        _ => window.path().download_dir().unwrap_or_else(|_| PathBuf::from(".")),
    };

    get_unique_file_path(&mut write_path, &sanitized_filename);

    let file = match fs::File::create(&write_path).await {
        Ok(f) => f,
        Err(e) => {
            debug!("Failed to create file: {e:#?}");
            return HttpResponse::InternalServerError().body(format!("Failed to create file: {e}"));
        }
    };
    debug!("Saving file to {write_path:#?}");

    let mut bufwriter = BufWriter::new(file);
    let mut written: u64 = 0;
    let mut payload = models::ProgressUpdatePayload {
        id: uuid::Uuid::new_v4().to_string(),
        filename: sanitized_filename,
        progress: 0.0,
    };

    while let Some(chunk) = body.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                debug!("Error reading body chunk: {e:#?}");
                return HttpResponse::InternalServerError().body(format!("Transfer interrupted: {e}"));
            }
        };

        if let Err(e) = bufwriter.write_all(&chunk).await {
            debug!("Failed to write chunk: {e:#?}");
            return HttpResponse::InternalServerError().body(format!("Failed to write to disk: {e}"));
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
        debug!("Failed to flush file: {e:#?}");
        return HttpResponse::InternalServerError().body(format!("Failed to finalize file: {e}"));
    }
    debug!("File saved to disk");

    HttpResponse::new(StatusCode::CREATED)
}

fn get_unique_file_path(write_path: &mut PathBuf, filename: &str) {
    if !write_path.join(filename).exists() {
        write_path.push(filename);
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
            return;
        }
    }
    unreachable!("Infinite loop should always find a unique name");
}

/// Handles `GET /` in ReceiveText mode
///
/// Serves the text-upload UI HTML page.
pub async fn serve_text_ui() -> impl Responder {
    HttpResponse::Ok().body(include_str!("../static/upload-text.html"))
}

/// Handles `POST /text` in ReceiveText mode
///
/// Buffers the plain-text request body and emits it as a
/// `received-text` event to the Tauri window.
///
/// Returns `204 No Content` on success.
pub async fn receive_text(
    window: web::Data<Window>,
    mut body: web::Payload,
) -> impl Responder {
    let mut body_bytes = BytesMut::new();
    while let Some(Ok(chunk)) = body.next().await {
        body_bytes.extend_from_slice(&chunk);
    }
    let body_str = String::from_utf8_lossy(&body_bytes);
    window.emit("received-text", body_str).unwrap();
    HttpResponse::new(StatusCode::NO_CONTENT)
}
