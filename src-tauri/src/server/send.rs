//! File and Text Sending Handlers
//!
//! This module implements HTTP route handlers for sending files and text to other devices.
//! It handles streaming file downloads with progress tracking and serves static HTML pages
//! for the download interface.

use actix_web::{
    body::SizedStream,
    http::header::{ContentDisposition, ContentType},
    web, Error, HttpRequest, HttpResponse, Responder,
};
use futures_util::stream;
use log::debug;
use tauri::{Emitter, Window};
use tokio::io::AsyncReadExt;

use crate::{api, models};

/// Chunk size for streaming file downloads (1 MiB).
///
/// Files are streamed in chunks of this size to:
/// - Limit memory usage for large files
/// - Enable progress tracking during transfer
/// - Provide responsive progress updates to the UI
const CHUNK_SIZE: usize = 1024 * 1024;

/// Serves the download page frontend.
///
/// This handler serves an HTML page that lists all available files for download.
/// The file metadata is embedded directly into the HTML as a URL-encoded JSON string.
///
/// # Route
///
/// `GET /` (when in SendFile mode)
///
/// # Implementation
///
/// The handler:
/// 1. Retrieves file metadata from application state
/// 2. Serializes it to JSON and URL-encodes it
/// 3. Injects it into the HTML template
/// 4. Returns the customized HTML page
///
/// # Arguments
///
/// - `file_datas`: Injected application state containing file metadata
///
/// # Returns
///
/// HTTP response with the rendered HTML page.
pub async fn download_frontend(file_datas: web::Data<Vec<models::FileData>>) -> impl Responder {
    let file_datas = file_datas.into_inner();
    let file_datas_json = serde_json::to_string(&file_datas).unwrap();
    let file_datas_json = urlencoding::encode(&file_datas_json);
    let download_page = include_str!("../static/download-file.html").to_string();
    let download_page = download_page.replace("<FILE_DATA_HERE>", &file_datas_json);
    HttpResponse::Ok().body(download_page)
}

/// Handles file download requests with streaming and progress tracking.
///
/// This handler streams a file in chunks, emitting progress updates to the frontend
/// during the transfer. Progress is reported in 0.1% increments to provide smooth
/// UI updates without overwhelming the event system.
///
/// # Route
///
/// `GET /download/{id}` (when in SendFile mode)
///
/// # Path Parameters
///
/// - `id`: Unique identifier for the file (matches `FileData.id`)
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
/// # Response Headers
///
/// - `Content-Type`: `application/octet-stream`
/// - `Content-Disposition`: `attachment; filename="<filename>"`
///
/// # Error Responses
///
/// - `400 Bad Request`: If ID is missing or invalid
///
/// # Implementation Notes
///
/// The file is streamed using an async unfold stream that:
/// 1. Reads chunks from the file asynchronously
/// 2. Calculates transfer progress
/// 3. Emits progress events when thresholds are crossed
/// 4. Returns chunks to be sent over HTTP
///
/// # TODO
///
/// This function would benefit from refactoring to reduce complexity.
pub async fn download_file(
    file_datas: web::Data<Vec<models::FileData>>,
    window: web::Data<Window>,
    req: HttpRequest,
) -> impl Responder {
    let Some(file_id) = req.match_info().get("id").map(String::from) else {
        return HttpResponse::BadRequest().body("Please provide an ID");
    };
    let file_datas = file_datas.into_inner();
    let window = window.into_inner();
    let Some(file_data) = file_datas.iter().find(|&file_data| file_data.id == file_id) else {
        return HttpResponse::BadRequest().body("Invalid ID provided");
    };
    let (file, _) = api::open_file(&file_data.filepath, &window);
    let file = tokio::fs::File::from_std(file);
    let file_name = file_data.filename.clone();
    let file_size = file_data.filesize;

    debug!("{file:#?}");
    debug!("{file_name:#?}");
    debug!("{file_size:#?}");
    let transferred: usize = 0;
    let payload = models::ProgressUpdatePayload {
        id: uuid::Uuid::new_v4().to_string(),
        filename: file_data.filename.clone(),
        progress: 0.0,
    };
    debug!("{:#?}", payload.id);

    // Create a stream that reads the file in chunks and tracks progress
    let data_stream = stream::unfold(
        (file, transferred, payload, window),
        move |(mut file, mut transferred, mut payload, window)| async move {
            let mut chunk = vec![0; CHUNK_SIZE];
            match file.read(&mut chunk).await {
                Ok(0) => None, // End of file
                Ok(n) => {
                    chunk.truncate(n);
                    transferred += n;
                    let new_progress = transferred as f32 * 100.0 / file_size as f32;
                    let rounded_progress = (new_progress * 10.0).round() / 10.0;
                    if payload.progress < rounded_progress {
                        payload.progress = rounded_progress;
                        window.emit("progress-update", &payload).unwrap();
                        debug!("{:#?}", payload.progress);
                    }
                    Some((
                        Ok::<_, Error>(web::Bytes::from(chunk)),
                        (file, transferred, payload, window),
                    ))
                }
                Err(e) => {
                    panic!("Error occurred while reading file: {e}")
                }
            }
        },
    );

    HttpResponse::Ok()
        .insert_header(ContentType::octet_stream())
        .insert_header(ContentDisposition::attachment(file_name))
        .body(SizedStream::new(file_size, data_stream))
}

/// Serves text content directly.
///
/// This handler returns the text content as the HTTP response body.
///
/// # Route
///
/// `GET /` (when in SendText mode)
///
/// # Arguments
///
/// - `text`: Injected application state containing the text to serve
///
/// # Returns
///
/// HTTP response with the text content as the body.
pub async fn handle_text(text: web::Data<String>) -> impl Responder {
    HttpResponse::Ok().body(text.get_ref().clone())
}
