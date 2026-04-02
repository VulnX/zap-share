use crate::{models, server};
use actix_web::dev::ServerHandle;
use log::debug;
use std::{
    io::Read,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex, RwLock,
    },
    thread::{self},
    time::Duration,
};
use tauri::{Manager, Runtime, Window};
use tauri_plugin_fs::{FsExt, SafeFilePath};
use tauri_plugin_ipd::IpdExt;

mod bcast;

pub static SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::new(None);
pub static BCAST_THREAD: Mutex<Option<models::BroadcastThread>> = Mutex::new(None);
pub static TRANSFER_MANAGER: Mutex<Option<Arc<server::recv::TransferManager>>> = Mutex::new(None);
pub static TRANSFER_MODE: RwLock<Option<models::TransferMode>> = RwLock::new(None);
pub static TERM_FLAG: RwLock<Option<Arc<AtomicBool>>> = RwLock::new(None);

static SHARED_DATA: Mutex<Option<Option<tauri_plugin_ipd::SharedData>>> = Mutex::new(None);

/// Retrieves the latest shared data (URIs and/or text) sent to the app via the Android share menu.
///
/// This function checks for new incoming shared data (e.g., content URIs or text) provided
/// through Android's share intents. It returns the data only if it has changed since the last call,
/// preventing redundant processing of the same shared content.
///
/// # Returns
/// - `Some(SharedData)` if new shared data (URIs or text) is received.
/// - `None` if the shared data is the same as the previously returned value.
///
/// # Behavior
/// - On the first invocation, returns the shared data and stores it internally.
/// - On subsequent invocations, compares the new data to the stored version.
/// - If the data is unchanged, returns `None`.
/// - If the data has changed, returns the new data and updates the stored version.
///
/// # Internals
/// - Uses a global `Mutex<Option<SharedData>>` to track and compare the most recently returned data.
#[allow(dead_code)]
#[tauri::command]
pub async fn get_shared_data<R: Runtime>(
    window: Window<R>,
) -> Option<tauri_plugin_ipd::SharedData> {
    let current_data = window.ipd().get_shared_data().unwrap().data;
    let mut prev_data = SHARED_DATA.lock().unwrap();
    match *prev_data {
        None => {
            *prev_data = Some(current_data.clone());
            current_data
        }
        // TODO: A bug here is that, if the same file is shared again, then the
        //       app will not detect it. Fix this somehow
        Some(ref prev_shared_data) => {
            if &current_data == prev_shared_data {
                None
            } else {
                *prev_data = Some(current_data.clone());
                current_data
            }
        }
    }
}

/// Starts server in `send` mode
///
/// Assumes filepath is a valid path to the user-selected file, or a content URI in case of Android
///
/// # Parameters (from JavaScript/TypeScript):
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
/// # Return value:
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
    window: Window<R>,
    files: Vec<(SafeFilePath, String)>,
) -> models::StartServerResponse {
    // TODO : Add file checks before starting server
    let file_datas: Vec<models::FileData> = files
        .into_iter()
        .map(|(filepath, filename)| models::FileData::from(filepath, filename, &window))
        .collect();
    let mode = models::TransferMode::Send(models::Send {
        files: Some(file_datas),
        text: None,
    });
    let mut transfer_mode_guard = TRANSFER_MODE.write().unwrap();
    *transfer_mode_guard = Some(mode);
    drop(transfer_mode_guard);
    start_server(window)
}

#[allow(dead_code)]
#[tauri::command]
pub async fn send_files_to<R: Runtime>(
    window: Window<R>,
    files: Vec<(SafeFilePath, String)>,
    to: models::ServerConfiguration,
) {
    let config = get_device_config(window.clone());
    let client = reqwest::Client::new();
    let request_endpoint = format!("http://{}:{}/upload/request", to.ip, to.port);
    let files_endpoint = format!("http://{}:{}/upload/files", to.ip, to.port);

    for (filepath, filename) in files {
        let (mut file, _) = open_file(&filepath, &window);
        let mut file_contents = Vec::new();
        file.read_to_end(&mut file_contents).unwrap();
        let filesize = file_contents.len() as u64;

        // 1. Send Request
        let transfer_request = models::TransferRequest {
            id: uuid::Uuid::new_v4().to_string(),
            device_name: config.name.clone(),
            r#type: "file".to_string(),
            filename: Some(filename.clone()),
            filesize: Some(filesize),
        };

        let resp = client
            .post(&request_endpoint)
            .json(&transfer_request)
            .send()
            .await;

        match resp {
            Ok(resp) if resp.status().is_success() => {
                let transfer_resp: models::TransferResponse = resp.json().await.unwrap();
                if transfer_resp.accepted {
                    if let Some(token) = transfer_resp.token {
                        // 2. Send File with token
                        println!("sending {filename:#?} to {files_endpoint:#?}");
                        client
                            .post(&files_endpoint)
                            .header("X-Filename", urlencoding::encode(&filename).into_owned())
                            .header("X-Transfer-Token", token)
                            .body(file_contents)
                            .send()
                            .await
                            .unwrap();
                    }
                } else {
                    println!("Transfer rejected by receiver for {filename}");
                }
            }
            _ => {
                println!("Transfer request failed or rejected for {filename}");
            }
        }
    }
}

#[allow(dead_code)]
#[tauri::command]
pub async fn send_text_to<R: Runtime>(
    window: Window<R>,
    text: String,
    to: models::ServerConfiguration,
) {
    let config = get_device_config(window.clone());
    let client = reqwest::Client::new();
    let request_endpoint = format!("http://{}:{}/upload/request", to.ip, to.port);
    let text_endpoint = format!("http://{}:{}/upload/text", to.ip, to.port);

    // 1. Send Request
    let transfer_request = models::TransferRequest {
        id: uuid::Uuid::new_v4().to_string(),
        device_name: config.name.clone(),
        r#type: "text".to_string(),
        filename: None,
        filesize: Some(text.len() as u64),
    };

    println!("sending text request to {request_endpoint:#?}");
    let resp = client
        .post(&request_endpoint)
        .json(&transfer_request)
        .send()
        .await;

    match resp {
        Ok(resp) if resp.status().is_success() => {
            let transfer_resp: models::TransferResponse = resp.json().await.unwrap();
            if transfer_resp.accepted {
                if let Some(token) = transfer_resp.token {
                    // 2. Send Text with token
                    println!("sending text to {text_endpoint:#?}");
                    client
                        .post(text_endpoint)
                        .header("Content-Type", "text/plain")
                        .header("X-Transfer-Token", token)
                        .body(text)
                        .send()
                        .await
                        .unwrap();
                }
            } else {
                println!("Text transfer rejected by receiver");
            }
        }
        _ => {
            println!("Text transfer request failed or rejected");
        }
    }
}

#[allow(dead_code)]
#[tauri::command]
pub fn get_device_config<R: Runtime>(window: Window<R>) -> models::DeviceConfig {
    let config_dir = window.path().app_config_dir().unwrap();
    let config_file_path = config_dir.join("config.json");
    let config_file_string = std::fs::read_to_string(config_file_path).unwrap();
    let config: models::DeviceConfig = serde_json::from_str(&config_file_string).unwrap();
    config
}

#[allow(dead_code)]
#[tauri::command]
pub fn send_text<R: Runtime>(window: Window<R>, text: String) -> models::StartServerResponse {
    let mode = models::TransferMode::Send(models::Send {
        files: None,
        text: Some(text),
    });
    {
        let mut guard = TRANSFER_MODE.write().unwrap();
        *guard = Some(mode);
    }
    start_server(window)
}

/// Starts the server in unified receive mode.
///
/// A single server handles both `POST /files` and `POST /text`,
/// so the user never has to choose up-front what they're receiving.
#[allow(dead_code)]
#[tauri::command]
pub fn recv<R: Runtime>(window: Window<R>) -> models::StartServerResponse {
    let mode = models::TransferMode::Receive;
    {
        let mut guard = TRANSFER_MODE.write().unwrap();
        *guard = Some(mode);
    }
    start_server(window)
}

#[allow(dead_code)]
#[tauri::command]
pub fn respond_to_transfer_request(id: String, accepted: bool) {
    let manager_guard = TRANSFER_MANAGER.lock().unwrap();
    if let Some(manager) = manager_guard.as_ref() {
        let mut pending = manager.pending.lock().unwrap();
        if let Some(tx) = pending.remove(&id) {
            let _ = tx.send(accepted);
        }
    }
}

#[allow(dead_code)]
#[tauri::command]
pub fn stop_server() {
    // let mut handle_guard = SERVER_HANDLE.lock().unwrap();
    // if let Some(server_handle) = handle_guard.take() {
    //     let rt = tokio::runtime::Runtime::new().unwrap();
    //     rt.block_on(async {
    //         server_handle.stop(true).await;
    //     });
    // }
    // let mut thread_guard = BCAST_THREAD.lock().unwrap();
    // if let Some(bcast_thread) = thread_guard.take() {
    //     bcast_thread.shutdown.store(true, Ordering::Relaxed);
    //     // Ignore the error
    //     let _ = bcast_thread.handle.join();
    //     *thread_guard = None;
    // }
    // let mut manager_guard = TRANSFER_MANAGER.lock().unwrap();
    // *manager_guard = None;
}

pub fn get_local_ip() -> String {
    // Attempt to automatically detect ip address. If this fails, then manually
    // probe every network interface and attempt to find one with ip address
    // starting with "192.168.". The `local_ip_address` crate at the moment of
    // writing this code is not able to automatically detect ip address in case
    // host machine is using its own hotspot, thus this is a minimalistic (and
    // possibly not the most appropriate) method to find a valid candidate.
    local_ip_address::local_ip()
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
        .map(|ipaddr| ipaddr.to_string())
        .unwrap() // Usually does NOT crash, so yeah, somewhat safe to use.
}

/// Starts actix web server in separate thread
///
/// If the server has started successfully then the `port` number and `ip` address will be returned
///
/// In case of any detected errors, corresponding `Error` type will be returned
fn start_server<R: Runtime>(window: Window<R>) -> models::StartServerResponse {
    // Clear ongoing requests by toggling the termination flag
    let mut term_flag_guard = TERM_FLAG.write().unwrap();
    if let Some(old_flag) = term_flag_guard.take() {
        old_flag.store(true, Ordering::Relaxed);
        debug!("sent termination to previous connections");
    }
    *term_flag_guard = Some(Arc::new(AtomicBool::new(false)));
    drop(term_flag_guard);

    // Clear pending upload requests
    debug!("resetting manager...");
    let mut transfer_manager_guard = TRANSFER_MANAGER.lock().unwrap();
    if let Some(manager) = transfer_manager_guard.as_mut() {
        let mut pending_guard = manager.pending.lock().unwrap();
        pending_guard.clear();
        let mut tokens_guard = manager.tokens.lock().unwrap();
        tokens_guard.clear();
    }
    drop(transfer_manager_guard);
    debug!("manager reset");

    let server_guard = SERVER_HANDLE.lock().unwrap();
    if server_guard.is_some() {
        // Server already running
        debug!("Server already running");
        let server_status = server::SERVER_STATUS.read().unwrap();
        let server_status = server_status.as_ref().unwrap(); // Safe to unwrap
        return models::StartServerResponse::Success(models::Url {
            ip: server_status.ip.clone(),
            port: server_status.port,
        });
    }
    drop(server_guard);

    debug!("Starting server...");

    // Used to transfer port number between actix thread and API responder thread
    let (tx, rx) = mpsc::channel::<u16>();
    thread::spawn({
        let window = window.clone();
        move || {
            server::start_server(window, tx);
        }
    });

    let port = match rx.recv_timeout(Duration::from_secs(10)) {
        Ok(n) => n,
        Err(_) => {
            return models::StartServerResponse::Error("Timeout: Failed to start server".into())
        }
    };

    let ip = get_local_ip();
    // Setup `SERVER_STATUS`
    let mut server_status_guard = server::SERVER_STATUS.write().unwrap();
    *server_status_guard = Some(server::ServerStatus {
        ip: ip.clone(),
        port,
    });
    drop(server_status_guard);

    // Setup `BCAST_THREAD`
    bcast::configure_bcast(window);
    models::StartServerResponse::Success(models::Url { ip, port })
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
