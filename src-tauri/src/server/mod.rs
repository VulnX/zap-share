//! HTTP Server Management
//!
//! This module handles the initialization and lifecycle management of the Actix-web
//! HTTP server used for file and text transfers. It manages TLS certificate generation,
//! route configuration, and server startup/shutdown.
//!
//! # Server Features
//!
//! - **Dynamic Port Assignment**: Automatically finds an available port
//! - **TLS/HTTPS**: All transfers are encrypted using self-signed certificates
//! - **Mode-Based Routing**: Routes are configured based on transfer mode
//! - **Zero-Timeout Shutdown**: Allows immediate server stop when needed

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

/// Generates a self-signed TLS certificate for HTTPS support.
///
/// This function creates a new self-signed certificate on-the-fly for each
/// server instance. The certificate is valid for the device's local IP address.
///
/// # Security Note
///
/// Self-signed certificates provide encryption but cannot be verified by
/// a certificate authority. This is acceptable for local network transfers
/// where the primary goal is preventing eavesdropping rather than establishing
/// identity verification.
///
/// # Returns
///
/// A configured `ServerConfig` ready for use with Actix-web's HTTPS server.
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

/// Starts an Actix-web HTTP server with routes configured for the specified transfer mode.
///
/// This function initializes and runs the HTTP server in the current thread. It:
///
/// 1. Configures logging via `env_logger`
/// 2. Generates a self-signed TLS certificate
/// 3. Sets up routes based on the transfer mode
/// 4. Binds to a random available port on `0.0.0.0`
/// 5. Sends the assigned port back to the caller via the channel
/// 6. Registers the server handle for graceful shutdown
/// 7. Runs the server until shutdown is requested
///
/// # Arguments
///
/// - `window`: Tauri window (passed to route handlers for file access and events)
/// - `mode`: Transfer mode determining which routes to enable
/// - `tx`: Channel sender for communicating the assigned port number
///
/// # Transfer Modes and Routes
///
/// - **SendFile**: Serves a download page and file download endpoints
/// - **ReceiveFile**: Serves an upload page and file upload endpoint
/// - **SendText**: Serves the text content directly
/// - **ReceiveText**: Serves an upload page for text and text upload endpoint
///
/// # Port Assignment
///
/// The server binds to port `0`, which tells the OS to assign any available port.
/// This ensures the server can always start, even if specific ports are in use.
///
/// # Blocking Behavior
///
/// This function blocks until the server is stopped. It should always be called
/// in a separate thread to avoid blocking the main application.
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
