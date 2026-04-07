use actix_web::{
    body::SizedStream,
    http::header::{self, ContentDisposition, ContentType},
    web, Error, HttpRequest, HttpResponse, Responder,
};
use futures_util::stream;
use log::{debug, info};
use tauri::{Emitter, Window};
use tokio::io::AsyncReadExt;

use crate::{api, models};

const CHUNK_SIZE: usize = 1024 * 1024; // 1 MiB

/// Handles `GET /download` in Send mode
///
/// Serves the download UI page with the list of available files
/// embedded as URL-encoded JSON.
/// Serves the download or text UI page.
pub async fn serve_download_ui() -> impl Responder {
    let mode = api::TRANSFER_MODE.read().unwrap();
    let mode = mode.as_ref().unwrap();
    let models::TransferMode::Send(ref data) = mode else {
        return HttpResponse::Found()
            .append_header((header::LOCATION, "/"))
            .finish();
    };
    if data.text.is_some() {
        let page = include_str!("../static/receive-text.html");
        HttpResponse::Ok().body(page)
    } else {
        let page = include_str!("../static/download-file.html");
        HttpResponse::Ok().body(page)
    }
}

pub async fn get_shared_content() -> impl Responder {
    let mode = api::TRANSFER_MODE.read().unwrap();
    let mode = mode.as_ref().unwrap();
    debug!("GET /api/shared-content; current mode: {:?}", mode);
    let models::TransferMode::Send(ref data) = mode else {
        debug!("Request forbidden: not in Send mode");
        return HttpResponse::Forbidden().body("Forbidden");
    };
    debug!(
        "Returning shared content: {} files, text length: {:?}",
        data.files.as_ref().map(|f| f.len()).unwrap_or(0),
        data.text.as_ref().map(|t| t.len())
    );
    HttpResponse::Ok().json(data)
}

/// Handles `GET /download/files/{id}` in Send mode
///
/// Streams the requested file directly from disk in 1 MiB chunks
/// (see `CHUNK_SIZE`) using a `SizedStream` response body.
///
/// Emits a `progress-update` event to the window whenever progress
/// increases by at least 0.1%, with the following payload:
/// ```javascript
/// { "id": String, "filename": String, "progress": Number /* 0-100 */ }
/// ```
///
/// Returns `404 Not Found` if the given `id` does not match any file.
pub async fn get_file(window: web::Data<Window>, req: HttpRequest) -> impl Responder {
    let mode_guard = api::TRANSFER_MODE.read().unwrap();
    let mode = mode_guard.as_ref().unwrap();
    let models::TransferMode::Send(ref data) = mode.clone() else {
        return HttpResponse::Forbidden().body("Forbidden");
    };

    // This is a blocking request, drop the `TRANSFER_MODE` guard
    drop(mode_guard);

    let Some(ref files) = data.files else {
        return HttpResponse::Forbidden().body("Files not shared");
    };

    let Some(file_id) = req.match_info().get("id").map(String::from) else {
        debug!("GET /download/files/:id - missing id in path");
        return HttpResponse::NotFound().body("File not found");
    };
    debug!("GET /download/files/{} requested", file_id);

    let window = window.into_inner();
    let Some(file_data) = files.iter().find(|fd| fd.id == file_id) else {
        debug!("File ID {} not found in shared files list", file_id);
        return HttpResponse::NotFound().body("File not found");
    };
    debug!(
        "Matched File ID {} to file: {}",
        file_id, file_data.filename
    );

    let (file, _) = api::open_file(&file_data.filepath, &window);
    let file: tokio::fs::File = tokio::fs::File::from_std(file);
    let file_name = file_data.filename.clone();
    let file_size = file_data.filesize;

    info!("Serving file: {file_name:#?} ({file_size} bytes)");

    let transferred: usize = 0;
    let payload = models::ProgressUpdatePayload {
        id: uuid::Uuid::new_v4().to_string(),
        filename: file_data.filename.clone(),
        progress: 0.0,
    };

    let term_flag = api::TERM_FLAG.read().unwrap().clone();
    let data_stream = stream::unfold(
        (file, transferred, payload, window, term_flag),
        move |(mut file, mut transferred, mut payload, window, term_flag)| async move {
            if let Some(ref flag) = term_flag {
                if flag.load(std::sync::atomic::Ordering::Relaxed) {
                    info!("Termination signal received, stopping stream");
                    return None;
                }
            }
            let mut chunk = vec![0; CHUNK_SIZE];
            match file.read(&mut chunk).await {
                Ok(0) => None,
                Ok(n) => {
                    chunk.truncate(n);
                    transferred += n;
                    let new_progress = transferred as f32 * 100.0 / file_size as f32;
                    let rounded = (new_progress * 10.0).round() / 10.0;
                    if payload.progress < rounded {
                        payload.progress = rounded;
                        window.emit("progress-update", &payload).unwrap();
                        debug!(
                            "Progress update for {}: {:.1}%",
                            payload.filename, payload.progress
                        );
                    }
                    debug!(
                        "Read chunk of size {} from {}",
                        chunk.len(),
                        payload.filename
                    );
                    Some((
                        Ok::<_, Error>(web::Bytes::from(chunk)),
                        (file, transferred, payload, window, term_flag),
                    ))
                }
                Err(e) => panic!("Error reading file: {e}"),
            }
        },
    );

    HttpResponse::Ok()
        .insert_header(ContentType::octet_stream())
        .insert_header(ContentDisposition::attachment(file_name))
        .body(SizedStream::new(file_size, data_stream))
}
