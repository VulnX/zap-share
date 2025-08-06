use crate::server;
use actix_web::dev::ServerHandle;
use rand::RngCore;
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{mpsc, Mutex},
    thread,
    time::Duration,
};
use tauri::{Runtime, Window};
use tauri_plugin_fs::{FsExt, SafeFilePath};

pub static SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::new(None);

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

#[derive(Clone, Debug, Serialize)]
pub struct FileData {
    pub id: String,
    pub filepath: SafeFilePath,
    pub filename: String,
    pub filesize: u64,
}

impl FileData {
    fn from<R: Runtime>(filepath: SafeFilePath, filename: String, window: &Window<R>) -> Self {
        let mut file_id = [0u8; 32];
        rand::rng().fill_bytes(&mut file_id);
        let id: String = file_id.iter().map(|byte| format!("{byte:02x}")).collect();
        let (file, _) = open_file(&filepath, window);
        let filesize = file.metadata().unwrap().len();
        Self {
            id,
            filepath,
            filename,
            filesize,
        }
    }
}

#[allow(dead_code)]
#[derive(Clone)]
pub enum TransferMode {
    Send(Vec<FileData>),
    Receive,
}

/// Starts server in `send` mode
///
/// Assumes filepath is a valid path to the user-selected file, or a content URI in case of Android
///
/// ### Parameters (from JavaScript/TypeScript):
///
/// - `files`: Array of `[path, name]` tuples:
///
/// Example:
/// ```ts
/// invoke('send_file', {
///   files: [
///     ['/Users/user/Pictures/photo.jpg', 'photo.jpg'],
///     ['content://com.android.providers...', 'video.mp4']
///   ]
/// });
/// ```
///
/// ### Return value:
/// ```ts
/// {
///   "Success": {
///     "ip": String | null, // Automatic IP detection may fail
///     "port": Number
///   }
/// }
/// ```
///
/// or
///
/// ```ts
/// { "Error": "<error message>" }
/// ```
#[allow(dead_code)]
#[tauri::command]
pub fn send_file<R: Runtime>(
    window: tauri::Window<R>,
    files: Vec<(SafeFilePath, String)>,
) -> StartServerResponse {
    // TODO : Add file checks before starting server
    let file_datas: Vec<FileData> = files
        .into_iter()
        .map(|(filepath, filename)| FileData::from(filepath, filename, &window))
        .collect();
    let mode = TransferMode::Send(file_datas);
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

    let port = match rx.recv_timeout(Duration::from_secs(10)) {
        Ok(n) => n,
        Err(_) => return StartServerResponse::Error("Timeout: Failed to start server".into()),
    };

    // Attempt to automatically detect ip address. If this fails, then manually
    // probe every network interface and attempt to find one with ip address
    // starting with "192.168.". The `local_ip_address` crate at the moment of
    // writing this code is not able to automatically detect ip address in case
    // host machine is using its own hotspot, thus this is a minimalistic (and
    // possibly not the most appropriate) method to find a valid candidate.
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

pub fn open_file<R: Runtime>(
    filepath: &SafeFilePath,
    window: &Window<R>,
) -> (std::fs::File, PathBuf) {
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
