use crate::{api::SERVER_HANDLE, models};
use actix_web::{middleware::Logger, rt, web, App, HttpServer};
use std::sync::mpsc;
use tauri::Runtime;

mod recv;
mod send;

/// Starts an actix-web server and registers REST routes based on `mode`.
///
/// The server binds to `0.0.0.0` on a randomly assigned port.
/// The assigned port is sent back to the caller via `tx`.
/// `SERVER_HANDLE` is registered once the server starts successfully.
///
/// ## Route map
///
/// ### SendFile
/// - `GET  /`          — download UI page
/// - `GET  /files/{id}` — stream a file by its ID
///
/// ### ReceiveFile
/// - `GET  /`          — upload UI page
/// - `POST /files`      — receive a streaming file upload
///
/// ### SendText
/// - `GET  /`          — UI page (redirects client to /text)
/// - `GET  /text`       — returns the raw text body
///
/// ### ReceiveText
/// - `GET  /`          — text input UI page
/// - `POST /text`       — receive plain-text body, emit to window
pub fn start_server<R: Runtime>(
    window: tauri::Window<R>,
    mode: models::TransferMode,
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
                models::TransferMode::SendFile(file_datas) => {
                    app = app
                        .route("/", web::get().to(send::serve_download_ui))
                        .route("/files/{id}", web::get().to(send::get_file))
                        .app_data(web::Data::new(file_datas.clone()))
                }
                // Unified receive mode — handles both files and text
                models::TransferMode::Receive => {
                    app = app
                        .route("/", web::get().to(recv::serve_upload_ui))
                        .route("/files", web::post().to(recv::receive_file))
                        .route("/text", web::post().to(recv::receive_text))
                }
                models::TransferMode::ReceiveFile => {
                    app = app
                        .route("/", web::get().to(recv::serve_upload_ui))
                        .route("/files", web::post().to(recv::receive_file))
                }
                models::TransferMode::SendText(text) => {
                    app = app
                        .route("/", web::get().to(send::get_text))
                        .route("/text", web::get().to(send::get_text))
                        .app_data(web::Data::new(text.clone()))
                }
                models::TransferMode::ReceiveText => {
                    app = app
                        .route("/", web::get().to(recv::serve_text_ui))
                        .route("/text", web::post().to(recv::receive_text))
                }
            };
            app = app.app_data(window.clone());
            app
        });
        if let Ok(_server) = _server.bind(("0.0.0.0", 0)) {
            // port `0` triggers automatic random port assignment
            server = _server;
            break;
        }
        // The caller should handle `recv_timeout` since this could
        // (hypothetically) spin indefinitely
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
    // Manually drop the guard so other threads can acquire it while
    // this function blocks on the server future.
    drop(guard);
    rt::System::new().block_on(server).unwrap();
}
