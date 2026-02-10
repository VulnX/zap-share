//! File and Text Receiving Handlers
//!
//! This module implements HTTP route handlers for receiving files and text from other devices.
//! It handles streaming file uploads with progress tracking, automatic file naming to avoid
//! collisions, and serves static HTML pages for the upload interface.

use std::path::PathBuf;

use actix_web::{
    web::{self, BytesMut},
    HttpResponse, Responder,
};
use futures_util::StreamExt;
use log::debug;
use tauri::{Emitter, Manager, Window};
use tokio::{
    fs,
    io::{AsyncWriteExt, BufWriter},
};

use crate::models;

/// Serves the file upload page.
///
/// This handler returns an HTML page that allows users to select and upload files.
/// The page is embedded directly in the binary.
///
/// # Route
///
/// `GET /` (when in ReceiveFile mode)
///
/// # Returns
///
/// HTTP response with the upload form HTML.
pub async fn upload() -> impl Responder {
    HttpResponse::Ok().body(include_str!("../static/upload-file.html"))
}

/// Handles file upload with streaming and progress tracking.
///
/// This handler receives a file via streaming upload and writes it directly to disk
/// chunk-by-chunk. It automatically saves files to the appropriate downloads directory
/// based on the platform and handles filename collisions by appending a counter.
///
/// # Route
///
/// `POST /upload/{filename}/{filesize}` (when in ReceiveFile mode)
///
/// # Path Parameters
///
/// - `filename`: Name of the file being uploaded
/// - `filesize`: Total size of the file in bytes (for progress calculation)
///
/// # File Storage Locations
///
/// - **Android**: `/storage/emulated/0/Download/`
/// - **Other platforms**: Platform-specific downloads directory (from Tauri path API)
///
/// # Filename Collision Handling
///
/// If a file with the same name already exists, the handler automatically appends
/// a counter to create a unique filename:
/// - `document.pdf` → `document (1).pdf`
/// - `document (1).pdf` → `document (2).pdf`
///
/// This prevents accidental overwrites while maintaining clean filenames.
///
/// # Progress Events
///
/// Emits `progress-update` events to the window with payload:
/// ```json
/// {
///   "id": "unique-session-id",
///   "filename": "example.jpg",
///   "progress": 45.3
/// }
/// ```
///
/// Progress updates are sent when the progress changes by at least 0.1%.
///
/// # Arguments
///
/// - `window`: Tauri window for emitting events and accessing path APIs
/// - `path`: Path parameters (filename and filesize)
/// - `body`: Streaming request body containing file data
///
/// # Returns
///
/// HTTP 200 OK response when upload completes successfully.
///
/// # Implementation Notes
///
/// - Uses buffered I/O for efficient disk writes
/// - Processes the upload stream chunk-by-chunk to limit memory usage
/// - Flushes the buffer after all chunks are written
///
/// # Known Issues
///
/// - On Android, hardcodes the downloads path since Tauri may not detect it correctly
pub async fn upload_file(
    window: web::Data<Window>,
    path: web::Path<(String, u64)>,
    mut body: web::Payload,
) -> impl Responder {
    let (filename, filesize) = path.into_inner();
    debug!("{filename:#?}");
    debug!("{filesize:#?}");

    // Fallback to static path on Android since Tauri does not detect the
    // system downloads directory reliably
    let mut write_path = match tauri_plugin_os::platform() {
        "android" => PathBuf::from("/storage/emulated/0/Download"),
        _ => window.path().download_dir().unwrap(),
    };

    get_unique_file_path(&mut write_path, &filename);

    let file = fs::File::create(&write_path).await.unwrap();
    debug!("saving file to {write_path:#?}");
    let mut bufwriter = BufWriter::new(file);
    let mut written = 0;
    let mut payload = models::ProgressUpdatePayload {
        id: uuid::Uuid::new_v4().to_string(),
        filename,
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
    bufwriter.flush().await.unwrap();
    debug!("saved on disk");

    HttpResponse::Ok()
}

/// Generates a unique file path by appending a counter if the file exists.
///
/// This function modifies the provided `write_path` to point to a unique filename.
/// If the original filename is available, it uses it. Otherwise, it appends `(1)`,
/// `(2)`, etc. until a unique filename is found.
///
/// # Algorithm
///
/// 1. If `filename` doesn't exist, use it as-is
/// 2. Split filename into name and extension
/// 3. Try `name (1).ext`, `name (2).ext`, etc. until a unique name is found
/// 4. Update `write_path` with the unique filename
///
/// # Arguments
///
/// - `write_path`: Mutable reference to the directory path (will be updated with filename)
/// - `filename`: Desired filename (may be modified if it exists)
///
/// # Examples
///
/// ```text
/// Input: /downloads/, "photo.jpg" (exists)
/// Output: /downloads/photo (1).jpg
///
/// Input: /downloads/, "document" (exists)
/// Output: /downloads/document (1)
/// ```
///
/// # Panics
///
/// The function has an infinite loop that should always find a unique name.
/// In practice, this is safe as it's unlikely to exhaust numeric suffixes.
fn get_unique_file_path(write_path: &mut PathBuf, filename: &String) {
    if !write_path.join(filename).exists() {
        write_path.push(filename);
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

/// Serves the text upload page.
///
/// This handler returns an HTML page that allows users to enter and submit text.
///
/// # Route
///
/// `GET /` (when in ReceiveText mode)
///
/// # Returns
///
/// HTTP response with the text upload form HTML.
pub async fn handle_text() -> impl Responder {
    HttpResponse::Ok().body(include_str!("../static/upload-text.html"))
}

/// Handles text upload via POST request.
///
/// This handler receives text content from the request body and emits it
/// to the frontend via a `received-text` event.
///
/// # Route
///
/// `POST /upload` (when in ReceiveText mode)
///
/// # Arguments
///
/// - `window`: Tauri window for emitting events
/// - `body`: Streaming request body containing text data
///
/// # Events
///
/// Emits a `received-text` event with the received text as the payload.
///
/// # Returns
///
/// HTTP 200 OK response after processing the text.
pub async fn handle_text_upload(
    window: web::Data<Window>,
    mut body: web::Payload,
) -> impl Responder {
    let mut body_bytes = BytesMut::new();
    while let Some(Ok(chunk)) = body.next().await {
        body_bytes.extend_from_slice(&chunk);
    }
    let body_str = String::from_utf8_lossy(&body_bytes);
    window.emit("received-text", body_str).unwrap();
    HttpResponse::Ok()
}
