use actix_web::{
    body::SizedStream,
    http::header::{ContentDisposition, ContentType},
    middleware::Logger,
    rt, web, App, HttpResponse, HttpServer, Responder,
};
use futures_util::stream;
use rand::RngCore;
use serde::Serialize;
use std::{io::Error, path::PathBuf, sync::mpsc};
use tauri::{Emitter, Runtime, Window};
use tauri_plugin_fs::{FsExt, SafeFilePath};
use tokio::io::AsyncReadExt;

use crate::api::{TransferMode, SERVER_HANDLE};

const CHUNK_SIZE: usize = 1024 * 1024; // 1 MiB

#[derive(Serialize, Clone, Debug)]
struct ProgressUpdatePayload {
    id: String,
    progress: usize,
}

fn open_file(
    filepath: &web::Data<SafeFilePath>,
    window: &web::Data<Window>,
) -> (std::fs::File, PathBuf) {
    let filepath: &SafeFilePath = &***filepath;
    match filepath {
        SafeFilePath::Path(_) => {
            let path: PathBuf = filepath.clone().into_path().unwrap();
            let file = std::fs::OpenOptions::new().read(true).open(&path).unwrap();
            (file, path)
        }
        SafeFilePath::Url(url) => {
            let path: PathBuf = url.as_str().into();
            let file = window
                .fs()
                .open(
                    filepath.clone(),
                    tauri_plugin_fs::OpenOptions::new().read(true).clone(),
                )
                .unwrap();
            (file, path)
        }
    }
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
async fn download(filepath: web::Data<SafeFilePath>, window: web::Data<Window>) -> impl Responder {
    let _filepath = &filepath.clone().into_inner();
    let _filepath = &**_filepath;
    let file_name = window.fs().file_name(_filepath.clone()).unwrap();
    let (file, path) = open_file(&filepath, &window);
    let file = tokio::fs::File::from_std(file);
    println!("{:?}", file);
    println!("{:?}", path);
    println!("{:?}", file_name);
    let file_size = file.metadata().await.unwrap().len();
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

#[allow(unreachable_code)]
async fn upload() -> impl Responder {
    unimplemented!();
    HttpResponse::Ok().body("unimplemented")
}

/// Starts an actix web server and enables required routes based on the given `mode`
///
/// Server will be exposed at : `0.0.0.0`
///
/// Port will be randomly assigned and sent back to caller function via `tx` channel
///
/// `SERVER_HANDLE` will be registered after server starts successfully
pub fn start_server<R: Runtime>(
    window: tauri::Window<R>,
    mode: TransferMode,
    tx: mpsc::Sender<u16>,
) {
    let _ = env_logger::try_init_from_env(env_logger::Env::new().default_filter_or("debug"));
    let server;
    loop {
        let mode = mode.clone();
        let window = web::Data::new(window.clone());
        let _server = HttpServer::new(move || {
            let app = App::new();
            let mut app = app.wrap(Logger::default());
            match &mode {
                TransferMode::Send(filepath) => {
                    app = app
                        .route("/download", web::get().to(download))
                        .app_data(web::Data::new(filepath.clone()))
                }
                TransferMode::Receive => app = app.route("/upload", web::get().to(upload)),
            };
            app = app.app_data(window.clone());
            app
        });
        if let Ok(_server) = _server.bind(("0.0.0.0", 0)) {
            // port is `0` to allow automatic assigning of random port
            server = _server;
            break;
        }
        // The caller function should handle `recv_timeout` because this may
        // (hypothetically) get stuck in an infinite loop
    }
    let port = server
        .addrs()
        .first()
        .expect("valid address from server")
        .port();
    tx.send(port).unwrap();
    let server = server.shutdown_timeout(0).run();
    let mut guard = SERVER_HANDLE.lock().unwrap();
    *guard = Some(server.handle());
    // This function will be running as long as the server is, thus guard
    // won't be dropped automatically. To make it available for other
    // threads, we need to manually drop it here.
    drop(guard);
    rt::System::new().block_on(server).unwrap();
}
