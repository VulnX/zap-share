use std::path::PathBuf;

use actix_web::{web, HttpResponse, Responder};
use futures_util::StreamExt;
use log::debug;
use tauri::{Emitter, Manager, Window};
use tokio::{
    fs,
    io::{AsyncWriteExt, BufWriter},
};

/// Handles the `/` route in RECEIVE mode
///
/// Serves an HTML form (from `static/upload.html`) allowing the user to
/// upload a file via POST request.
pub async fn upload() -> impl Responder {
    HttpResponse::Ok().body(include_str!("../static/upload.html"))
}

/// Handles the `/upload/{filename}/{filesize}` POST route
///
/// Receives a streaming file upload via the request body and writes it
/// directly to disk, chunk-by-chunk, at a platform-specific downloads path.
///
/// On Android, the file is saved to:
/// `/storage/emulated/0/Download/{filename}`
///
/// On other platforms, it is saved to the path resolved from:
/// `window.path().download_dir()`
///
/// Emits a `progress-update` event to the window after writing each chunk,
/// with the following payload:
/// ```javascript
/// Number // Progress percentage (0-100)
/// ```
///
/// # Path Parameters
/// - `filename`: The name of the file being uploaded.
/// - `filesize`: The total size of the file in bytes (used to calculate progress).
///
/// # Errors
/// - Upload fails if a file by same name already exists (should be easy fix)
pub async fn upload_file(
    window: web::Data<Window>,
    path: web::Path<(String, u64)>,
    mut body: web::Payload,
) -> impl Responder {
    let (filename, filesize) = path.into_inner();
    debug!("{filename:#?}");
    debug!("{filesize:#?}");

    // Fallback to static path on android since tauri does not detect the
    // system downloads directory
    let mut write_path = match tauri_plugin_os::platform() {
        "android" => PathBuf::from("/storage/emulated/0/Download"),
        _ => window.path().download_dir().unwrap(),
    };
    write_path.push(filename);
    debug!("saving file to {write_path:#?}");

    let file = fs::File::create(write_path).await.unwrap();
    let mut bufwriter = BufWriter::new(file);
    let mut written = 0;
    while let Some(chunk) = body.next().await {
        let chunk = chunk.unwrap();
        bufwriter.write_all(&chunk).await.unwrap();
        written += chunk.len();
        window.emit("progress-update", written as f64 * 100.0 / filesize as f64).unwrap();
    }
    debug!("saved on disk");

    HttpResponse::Ok()
}
