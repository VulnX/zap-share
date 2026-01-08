use crate::{
    api::{self, SERVER_HANDLE},
    models,
};
use actix_web::{middleware::Logger, rt, web, App, HttpServer};
use log::debug;
use rustls::{
    pki_types::{CertificateDer, PrivateKeyDer},
    ServerConfig,
};
use std::sync::mpsc;
use tauri::Runtime;

mod recv;
mod send;

fn generate_tls_config() -> ServerConfig {
    debug!("generating tls config");
    let cert = rcgen::generate_simple_self_signed([api::get_local_ip()]).unwrap();
    let cert_der = CertificateDer::from(cert.cert.der().to_vec());
    let key_der = PrivateKeyDer::Pkcs8(cert.signing_key.serialize_der().into());
    debug!("yeah done");
    ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(vec![cert_der], key_der)
        .unwrap()
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
    mode: models::TransferMode,
    tx: mpsc::Sender<u16>,
) {
    let _ = env_logger::try_init_from_env(env_logger::Env::new().default_filter_or("debug"));
    let server;
    let tls_config = generate_tls_config();
    loop {
        let mode = mode.clone();
        let window = web::Data::new(window.clone());
        let _server = HttpServer::new(move || {
            let app = App::new();
            let mut app = app.wrap(Logger::default());
            match &mode {
                models::TransferMode::SendFile(file_datas) => {
                    app = app
                        .route("/", web::get().to(send::download_frontend))
                        .route("/download/{id}", web::get().to(send::download_file))
                        .app_data(web::Data::new(file_datas.clone()))
                }
                models::TransferMode::ReceiveFile => {
                    app = app.route("/", web::get().to(recv::upload)).route(
                        "/upload/{filename}/{filesize}",
                        web::post().to(recv::upload_file),
                    )
                }
                models::TransferMode::SendText(text) => {
                    app = app
                        .route("/", web::get().to(send::handle_text))
                        .app_data(web::Data::new(text.clone()))
                }
                models::TransferMode::ReceiveText => {
                    app = app
                        .route("/", web::get().to(recv::handle_text))
                        .route("/upload", web::post().to(recv::handle_text_upload))
                }
            };
            app = app.app_data(window.clone());
            app
        });
        if let Ok(_server) = _server.bind_rustls_0_23(("0.0.0.0", 0), tls_config.clone()) {
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
