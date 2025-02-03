use crate::server;
use actix_web::dev::ServerHandle;
use serde::Serialize;
use std::{
    sync::{mpsc, Mutex},
    thread,
    time::Duration,
};
use tauri::Runtime;
use tauri_plugin_fs::SafeFilePath;

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
    Send(SafeFilePath),
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
pub fn send_file<R: Runtime>(
    window: tauri::Window<R>,
    filepath: SafeFilePath,
) -> StartServerResponse {
    // TODO : Add file checks before starting server
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

    // Attempt to automatically detect ip address. If this fails, then manually
    // probe every network interface and attempt to find one with ip address
    // starting with "192.168.". The `local_ip_address` crate at the moment of
    // writing this code is not able to automatically detect ip address in case
    // host machine is using its own hotspot, thus this is a minimalistic (and
    // possibly not the most appropriate) method to find a valid candiate.
    let ip = local_ip_address::local_ip()
        .ok()
        .or_else(|| {
            local_ip_address::list_afinet_netifas()
                .ok()
                .and_then(|network_interfaces| {
                    network_interfaces
                        .iter()
                        .find(|(_, ipaddr)| ipaddr.to_string().starts_with("192.168."))
                        .map(|(_, ipaddr)| *ipaddr)
                })
        })
        .map(|ipaddr| ipaddr.to_string());
    StartServerResponse::Success(Url { ip, port })
}
