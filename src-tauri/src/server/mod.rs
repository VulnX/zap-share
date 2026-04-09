use crate::{
    api::{self, SERVER_HANDLE},
    models,
};
use actix_web::{middleware::Logger, rt, web, App, HttpServer, Responder};
use futures_util::stream;
use log::debug;
use rustls::{
    pki_types::{CertificateDer, PrivateKeyDer},
    ServerConfig,
};
use std::sync::{mpsc, Arc, OnceLock, RwLock};
use tauri::Runtime;
use tokio::sync::broadcast;

pub mod recv;
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

pub struct ServerStatus {
    pub ip: String,
    pub port: u16,
}

pub static SERVER_STATUS: RwLock<Option<ServerStatus>> = RwLock::new(None);
static EVENT_SENDER: OnceLock<broadcast::Sender<String>> = OnceLock::new();

pub fn get_event_sender() -> &'static broadcast::Sender<String> {
    EVENT_SENDER.get_or_init(|| {
        let (tx, _) = broadcast::channel(16);
        tx
    })
}

/// Starts an actix-web server and registers REST routes based on `mode`.
///
/// The server binds to `0.0.0.0` on a randomly assigned port.
/// The assigned port is sent back to the caller via `tx`.
/// `SERVER_HANDLE` is registered once the server starts successfully.
pub fn start_server<R: Runtime>(window: tauri::Window<R>, tx: mpsc::Sender<u16>) {
    let server;
    loop {
        let window_clone = window.clone();
        let window_data = web::Data::new(window_clone.clone());
        let manager = Arc::new(recv::TransferManager::new());
        {
            let mut global_manager = crate::api::TRANSFER_MANAGER.lock().unwrap();
            *global_manager = Some(manager.clone());
        }
        let manager_data = web::Data::from(manager);
        let config = api::get_app_config(window_clone.clone());
        let tls_config = if config.encryption {
            Some(generate_tls_config())
        } else {
            None
        };

        let _server = HttpServer::new(move || {
            let app = App::new();
            let mut app = app.wrap(Logger::default());
            app = app.app_data(manager_data.clone());
            // TODO: Allow all routes here, and return 403 Forbidden in
            // individual handlers based on current mode. This will allow us to
            // use same server when switching between SEND and RECV modes.
            app = app
                .route("/", web::get().to(handle_root))
                .route("/events", web::get().to(handle_events))
                .route(
                    "/api/shared-content",
                    web::get().to(send::get_shared_content),
                )
                .route("/download", web::get().to(send::serve_download_ui))
                .route("/download/files/{id}", web::get().to(send::get_file))
                .route("/upload", web::get().to(recv::serve_upload_ui))
                .route("/upload/request", web::post().to(recv::handle_request))
                .route("/upload/files", web::post().to(recv::receive_file))
                .route("/upload/text", web::post().to(recv::receive_text));
            app = app.app_data(window_data.clone());
            app
        });

        let bind_result = if let Some(tls) = tls_config {
            _server.bind_rustls_0_23(("0.0.0.0", config.preferred_port), tls)
        } else {
            _server.bind(("0.0.0.0", config.preferred_port))
        };

        if let Ok(_server) = bind_result {
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

async fn handle_root() -> web::Redirect {
    let mode = api::TRANSFER_MODE.read().unwrap();
    let mode = mode.as_ref().unwrap();
    match *mode {
        models::TransferMode::Send(_) => web::Redirect::to("/download"),
        models::TransferMode::Receive => web::Redirect::to("/upload"),
    }
}

async fn handle_events() -> impl Responder {
    let rx = get_event_sender().subscribe();
    let stream = stream::unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Ok(msg) => {
                debug!("Received event: {}", msg);
                Some((
                    Ok::<_, actix_web::Error>(actix_web_lab::sse::Event::Data(
                        actix_web_lab::sse::Data::new(msg),
                    )),
                    rx,
                ))
            }
            Err(broadcast::error::RecvError::Lagged(_)) => {
                // Ignore lagged messages but keep going
                Some((
                    Ok::<_, actix_web::Error>(actix_web_lab::sse::Event::Comment("ping".into())),
                    rx,
                ))
            }
            Err(broadcast::error::RecvError::Closed) => None,
        }
    });

    actix_web_lab::sse::Sse::from_stream(stream).with_keep_alive(std::time::Duration::from_secs(15))
}
