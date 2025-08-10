use crate::api::{TransferMode, SERVER_HANDLE};
use actix_web::{middleware::Logger, rt, web, App, HttpServer};
use std::sync::mpsc;
use tauri::Runtime;

mod recv;
mod send;
mod common;

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
                TransferMode::Send(file_datas) => {
                    app = app
                        .route("/", web::get().to(send::download_frontend))
                        .route("/download/{id}", web::get().to(send::download_file))
                        .app_data(web::Data::new(file_datas.clone()))
                }
                TransferMode::Receive => {
                    app = app.route("/", web::get().to(recv::upload)).route(
                        "/upload/{filename}/{filesize}",
                        web::post().to(recv::upload_file),
                    )
                }
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
