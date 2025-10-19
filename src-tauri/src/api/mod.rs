use crate::{models, server};
use actix_web::dev::ServerHandle;
use std::{
    io::Read,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
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
    let mode = models::TransferMode::SendFile(file_datas);
    start_server(window, mode)
}

#[allow(dead_code)]
#[tauri::command]
pub async fn send_files_to<R: Runtime>(
    window: Window<R>,
    files: Vec<(SafeFilePath, String)>,
    to: models::ServerConfiguration,
) {
    for (filepath, filename) in files {
        let (mut file, _) = open_file(&filepath, &window);
        let client = reqwest::Client::new();
        let endpoint = format!(
            "http://{}:{}/upload/{}/{}",
            to.ip,
            to.port,
            filename,
            file.metadata().unwrap().len()
        );
        println!("sending {file:#?} to {endpoint:#?}");
        let mut file_contents = Vec::new();
        file.read_to_end(&mut file_contents).unwrap();
        client
            .post(endpoint)
            .body(file_contents)
            .send()
            .await
            .unwrap();
    }
}

#[allow(dead_code)]
#[tauri::command]
pub async fn send_text_to(text: String, to: models::ServerConfiguration) {
    let client = reqwest::Client::new();
    let endpoint = format!("http://{}:{}/upload", to.ip, to.port);
    println!("sending {text:#?} to {endpoint:#?}");
    client.post(endpoint).body(text).send().await.unwrap();
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

/// Starts server in `receive` mode
///
/// # Parameters (from JavaScript/TypeScript):
///
/// No parameters are required.
///
/// Example:
/// ```ts
/// invoke('recv_file');
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
pub fn recv_file<R: Runtime>(window: Window<R>) -> models::StartServerResponse {
    let mode = models::TransferMode::ReceiveFile;
    start_server(window, mode)
}

#[allow(dead_code)]
#[tauri::command]
pub fn send_text<R: Runtime>(window: Window<R>, text: String) -> models::StartServerResponse {
    let mode = models::TransferMode::SendText(text);
    start_server(window, mode)
}

#[allow(dead_code)]
#[tauri::command]
pub fn recv_text<R: Runtime>(window: Window<R>) -> models::StartServerResponse {
    let mode = models::TransferMode::ReceiveText;
    start_server(window, mode)
}

#[allow(dead_code)]
#[tauri::command]
pub fn stop_server() {
    let mut handle_guard = SERVER_HANDLE.lock().unwrap();
    if let Some(server_handle) = handle_guard.take() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            server_handle.stop(true).await;
        });
    }
    let mut thread_guard = BCAST_THREAD.lock().unwrap();
    if let Some(bcast_thread) = thread_guard.take() {
        bcast_thread.shutdown.store(true, Ordering::Relaxed);
        bcast_thread.handle.join().unwrap();
        *thread_guard = None;
    }
}

/// Starts (or re-starts existing) actix web server in separate thread
///
/// If the server has started successfully then the `port` number and (optionally detected) `ip` address will be returned
///
/// In case of any detected errors, corresponding `Error` type will be returned
fn start_server<R: Runtime>(
    window: Window<R>,
    mode: models::TransferMode,
) -> models::StartServerResponse {
    // Stop any running server instance before starting a new one
    stop_server();

    let (tx, rx) = mpsc::channel::<u16>();
    thread::spawn({
        let mode = mode.clone();
        let window = window.clone();
        move || {
            server::start_server(window, mode, tx);
        }
    });

    let port = match rx.recv_timeout(Duration::from_secs(10)) {
        Ok(n) => n,
        Err(_) => {
            return models::StartServerResponse::Error("Timeout: Failed to start server".into())
        }
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
        .map(|ipaddr| ipaddr.to_string())
        .unwrap();
    let config_file_path = window.path().app_config_dir().unwrap().join("config.json");
    let config_json = std::fs::read_to_string(config_file_path).unwrap();
    let config: models::DeviceConfig = serde_json::from_str(&config_json).unwrap();
    let shutdown = Arc::new(AtomicBool::new(false));
    let shutdown_clone = shutdown.clone();
    let bcast_thread_handle = match mode {
        models::TransferMode::SendFile(_) => {
            thread::spawn(|| bcast::recv_emitted_info(window, config, shutdown_clone))
        }
        models::TransferMode::ReceiveFile => {
            thread::spawn(move || bcast::emit_info(port, config, shutdown_clone))
        }
        models::TransferMode::SendText(_) => {
            thread::spawn(|| bcast::recv_emitted_info(window, config, shutdown_clone))
        }
        models::TransferMode::ReceiveText => {
            thread::spawn(move || bcast::emit_info(port, config, shutdown_clone))
        }
    };
    let mut thread_guard = BCAST_THREAD.lock().unwrap();
    *thread_guard = Some(models::BroadcastThread {
        handle: bcast_thread_handle,
        shutdown,
    });
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
