use actix_web::{
    body::SizedStream,
    http::header::{ContentDisposition, ContentType},
    rt, web, App, HttpResponse, HttpServer, Responder,
};
use futures_util::stream;
use std::{io::Error, path::PathBuf, sync::mpsc};
use tauri::{Emitter, Runtime, Window};
use tokio::io::AsyncReadExt;

use crate::api::{TransferMode, SERVER_HANDLE};

const CHUNK_SIZE: usize = 1024 * 1024; // 1 MiB

// TODO : Refactor this entire function
async fn download(filepath: web::Data<PathBuf>, window: web::Data<Window>) -> impl Responder {
    let filepath = &**filepath.clone();
    let file_name = filepath.file_name().unwrap().to_str().unwrap();
    let file = tokio::fs::File::open(filepath)
        .await
        .expect("successfully open selected file");
    let file_size = file.metadata().await.unwrap().len();
    let transferred: usize = 0;
    let progress = 0;
    let data_stream = stream::unfold(
        (file, transferred, progress, window),
        move |(mut file, mut transferred, mut progress, window)| async move {
            let mut chunk = vec![0; CHUNK_SIZE];
            match file.read(&mut chunk).await {
                Ok(0) => None,
                Ok(n) => {
                    chunk.truncate(n);
                    transferred += n;
                    dbg!(transferred);
                    let new_progress = transferred * 100 / file_size as usize;
                    if new_progress > progress {
                        progress = new_progress;
                        window.emit("progress-update", progress).unwrap();
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

pub fn start_server<R: Runtime>(
    window: tauri::Window<R>,
    mode: TransferMode,
    tx: mpsc::Sender<u16>,
) {
    let server;
    let window = web::Data::new(window);
    loop {
        let mode = mode.clone();
        let window = web::Data::new(window.clone());
        let _server = HttpServer::new(move || {
            let mut app = App::new();
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
