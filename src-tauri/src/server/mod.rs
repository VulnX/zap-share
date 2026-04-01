use crate::{api::SERVER_HANDLE, models};
use actix_web::{middleware::Logger, rt, web, App, HttpServer};
use std::sync::{mpsc, Arc};
use tauri::Runtime;

pub mod recv;
mod send;

/// Starts an actix-web server and registers REST routes based on `mode`.
///
/// The server binds to `0.0.0.0` on a randomly assigned port.
/// The assigned port is sent back to the caller via `tx`.
/// `SERVER_HANDLE` is registered once the server starts successfully.
pub fn start_server<R: Runtime>(
    window: tauri::Window<R>,
    mode: models::TransferMode,
    tx: mpsc::Sender<u16>,
) {
    let _ = env_logger::try_init_from_env(env_logger::Env::new().default_filter_or("debug"));
    let server;
    loop {
        let mode = mode.clone();
        let window_clone = window.clone();
        let window_data = web::Data::new(window_clone);
        let manager = Arc::new(recv::TransferManager::new());
        {
            let mut global_manager = crate::api::TRANSFER_MANAGER.lock().unwrap();
            *global_manager = Some(manager.clone());
        }
        let manager_data = web::Data::from(manager);
        let _server = HttpServer::new(move || {
            let app = App::new();
            let mut app = app.wrap(Logger::default());
            app = app.app_data(manager_data.clone());
            // TODO: Allow all routes here, and return 403 Forbidden in
            // individual handlers based on current mode. This will allow us to
            // use same server when switching between SEND and RECV modes.
            match &mode {
                models::TransferMode::SendFile(file_datas) => {
                    app = app
                        .route("/", web::get().to(send::serve_download_ui))
                        .route("/files/{id}", web::get().to(send::get_file))
                        .app_data(web::Data::new(file_datas.clone()))
                }
                models::TransferMode::SendText(text) => {
                    app = app
                        .route("/", web::get().to(send::get_text))
                        .route("/text", web::get().to(send::get_text))
                        .app_data(web::Data::new(text.clone()))
                }
                models::TransferMode::Receive => {
                    app = app
                        .route("/", web::get().to(recv::serve_upload_ui))
                        .route("/request", web::post().to(recv::handle_request))
                        .route("/files", web::post().to(recv::receive_file))
                        .route("/text", web::post().to(recv::receive_text))
                }
            };
            app = app.app_data(window_data.clone());
            app
        });
        if let Ok(_server) = _server.bind(("0.0.0.0", 0)) {
            // port `0` triggers automatic random port assignment
            server = _server;
            break;
        }
        // The caller should handle `recv_timeout` since this could
        // (hypothetically) spin indefinitely
        // ^^^^^^^^^^^^^^^^ can it really? <--- TODO
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
