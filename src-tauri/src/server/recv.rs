use std::path::PathBuf;

use actix_web::{web, HttpResponse, Responder};
use futures_util::StreamExt;
use log::debug;
use tauri::{Emitter, Manager, Window};
use tokio::{
    fs,
    io::{AsyncWriteExt, BufWriter},
};

use crate::server::common;

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

    get_unique_file_path(&mut write_path, &filename);

    let file = fs::File::create(&write_path).await.unwrap();
    debug!("saving file to {write_path:#?}");
    let mut bufwriter = BufWriter::new(file);
    let mut written = 0;
    let mut payload = common::ProgressUpdatePayload {
        id: filename,
        progress: 0.0,
    };
    while let Some(chunk) = body.next().await {
        let chunk = chunk.unwrap();
        bufwriter.write_all(&chunk).await.unwrap();
        written += chunk.len();
        let new_progress = written as f32 * 100.0 / filesize as f32;
        let rounded_progress = (new_progress * 10.0).round() / 10.0;
        if payload.progress < rounded_progress {
            payload.progress = rounded_progress;
            window.emit("progress-update", &payload).unwrap();
        }
    }
    debug!("saved on disk");

    HttpResponse::Ok()
}

fn get_unique_file_path(write_path: &mut PathBuf, filename: &String) {
    if !write_path.join(&filename).exists() {
        write_path.push(&filename);
        return;
    }

    let (name, ext) = match filename.rsplit_once('.') {
        Some((name, ext)) => (name.to_string(), Some(ext.to_string())),
        None => (filename.clone(), None),
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
