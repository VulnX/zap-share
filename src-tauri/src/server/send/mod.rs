use actix_web::{
    body::SizedStream,
    http::header::{ContentDisposition, ContentType},
    web, Error, HttpRequest, HttpResponse, Responder,
};
use futures_util::stream;
use rand::RngCore;
use serde::Serialize;
use tauri::{Emitter, Window};
use tokio::io::AsyncReadExt;

use crate::api;

const CHUNK_SIZE: usize = 1024 * 1024; // 1 MiB

#[derive(Serialize, Clone, Debug)]
struct ProgressUpdatePayload {
    id: String,
    progress: usize,
}

pub async fn download_frontend(file_datas: web::Data<Vec<api::FileData>>) -> impl Responder {
    let file_datas = file_datas.into_inner();
    let file_datas_json = serde_json::to_string(&file_datas).unwrap();
    let file_datas_json = urlencoding::encode(&file_datas_json);
    let download_page = include_str!("../../static/index.html").to_string();
    let download_page = download_page.replace("<FILE_DATA_HERE>", &file_datas_json);
    HttpResponse::Ok().body(download_page)
}

// TODO : Refactor this entire function
/// Handles the `/download` route
///
/// Creates a future `data_stream` by adding the file contents in 1MiB chunks
/// (see `CHUNK_SIZE`) and streaming it in the response body
///
/// Emits a `progress-update` event specific to this window with the following
/// payload scheme:
/// ```javascript
/// {
///     "id": String, // Random `id` specific to this transfer session
///     "progress": Number // Progress percentage ( 0-100 )
/// }
/// ```
///
/// if after adding a new chunk the overall progress difference is greater than 1%
pub async fn download_file(
    file_datas: web::Data<Vec<api::FileData>>,
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

    println!("{:?}", file);
    println!("{:?}", file_name);
    println!("{:?}", file_size);
    let transferred: usize = 0;
    let mut transfer_id = [0u8; 32];
    rand::rng().fill_bytes(&mut transfer_id);
    let transfer_id: String = transfer_id
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    let progress = ProgressUpdatePayload {
        id: transfer_id,
        progress: 0,
    };
    dbg!(&progress.id);
    let data_stream = stream::unfold(
        (file, transferred, progress, window),
        move |(mut file, mut transferred, mut progress, window)| async move {
            let mut chunk = vec![0; CHUNK_SIZE];
            match file.read(&mut chunk).await {
                Ok(0) => None,
                Ok(n) => {
                    chunk.truncate(n);
                    transferred += n;
                    let new_progress = transferred * 100 / file_size as usize;
                    if new_progress > progress.progress {
                        progress.progress = new_progress;
                        window.emit("progress-update", &progress).unwrap();
                        dbg!(&progress.progress);
                    }
                    Some((
                        Ok::<_, Error>(web::Bytes::from(chunk)),
                        (file, transferred, progress, window),
                    ))
                }
                Err(e) => {
                    panic!("Error occured while reading file: {e}")
                }
            }
        },
    );
    HttpResponse::Ok()
        .insert_header(ContentType::octet_stream())
        .insert_header(ContentDisposition::attachment(file_name))
        .body(SizedStream::new(file_size, data_stream))
}
