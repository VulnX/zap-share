use crate::server;
use actix_web::dev::ServerHandle;
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{mpsc, Mutex},
    thread,
    time::Duration,
};
use tauri::Runtime;

pub static SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::new(None);

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct Url {
    ip: Option<String>,
    port: u16,
}

#[derive(Debug, Serialize)]
pub enum StartServerResponse {
    Success(Url),
    Error(String),
}

#[allow(dead_code)]
#[derive(Clone)]
pub enum TransferMode {
    Send(PathBuf),
    Receive,
}

/// Starts server in `send` mode
///
/// Assumes filepath is a valid path to the user selected file, or a content URI in case of android.
///
/// Return value:
/// ```javascript
/// {
///   "Success": {
///     "ip": String | Null, // Automatic IP detection may fail
///     "port": Number
///   }
/// }
/// ```
///
/// or
///
/// ```javascript
/// { "Error": "<error message>" }
/// ```
#[allow(dead_code)]
#[tauri::command]
pub fn send_file<R: Runtime>(window: tauri::Window<R>, filepath: String) -> StartServerResponse {
    let filepath = PathBuf::from(filepath);
    if !filepath.is_file() {
        return StartServerResponse::Error("No such file exists".into());
    }
    let mode = TransferMode::Send(filepath);
    start_server(window, mode)
}

// pub fn pause() {
//     let mut stdout = stdout();
//     stdout.write(b"Press Enter to continue...").unwrap();
//     stdout.flush().unwrap();
//     stdin().read(&mut [0]).unwrap();
// }

/// Starts (or re-starts existing) actix web server in separate thread
/// 
/// If the server has started successfully then the `port` number and (optionally detected) `ip` address will be returned
/// 
/// In case of any detected errors, corresponding `Error` type will be returned
fn start_server<R: Runtime>(window: tauri::Window<R>, mode: TransferMode) -> StartServerResponse {
    // Stop any running server instance before starting a new one
    let mut handle_guard = SERVER_HANDLE.lock().unwrap();
    if let Some(server_handle) = handle_guard.take() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            server_handle.stop(true).await;
        });
    }

    let (tx, rx) = mpsc::channel::<u16>();
    thread::spawn(|| {
        server::start_server(window, mode, tx);
    });
    let port;
    match rx.recv_timeout(Duration::from_secs(10)) {
        Ok(n) => port = n,
        Err(_) => return StartServerResponse::Error("Timeout: Failed to start server".into()),
    }
    let ip = local_ip_address::local_ip().ok().map(|ip| ip.to_string());
    StartServerResponse::Success(Url { ip, port })
}
