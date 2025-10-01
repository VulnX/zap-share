use crate::{models, server};
use actix_web::dev::ServerHandle;
use std::{
    io::Read,
    path::PathBuf,
    sync::{mpsc, Mutex},
    thread,
    time::Duration,
};
use tauri::{Manager, Runtime, Window};
use tauri_plugin_fs::{FsExt, SafeFilePath};
use tauri_plugin_ipd::IpdExt;

mod bcast;

pub static SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::new(None);

static SHARED_URI_LIST: Mutex<Option<Vec<String>>> = Mutex::new(None);

/// Retrieves the list of content URIs sent to the app via the Android share menu.
///
/// This function ensures that the same list is not returned multiple times.
/// It compares the newly retrieved list against the previously stored one, and only
/// returns the list if it is different from the last one returned.
///
/// # Returns
/// A `Vec<String>` containing the parsed shared URIs. If the list is identical to the
/// previously retrieved one, returns an empty vector.
///
/// # Behavior
/// - On the first call (or if the list changes), returns the list of URIs.
/// - On subsequent calls with the same list, returns an empty vector.
/// - Internally stores the last seen list in a global `Mutex<Option<Vec<String>>>`.
///
/// # Notes
/// - The raw string `res` returned by `window.ipd().get_shared_uri_list().unwrap().uri_list`
///   is expected to be in the format `"[uri1, uri2, ...]"`.
/// - The function trims square brackets and whitespace, then splits the string by commas.
#[allow(dead_code)]
#[tauri::command]
pub async fn get_shared_uri_list<R: Runtime>(window: Window<R>) -> Vec<String> {
    let res = window.ipd().get_shared_uri_list().unwrap().uri_list;
    // Parse [XXX, YYY] from `res`
    let current_list: Vec<String> = res
        .trim_matches(|c| c == '[' || c == ']')
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let mut prev_shared_list = SHARED_URI_LIST.lock().unwrap();
    match *prev_shared_list {
        None => {
            *prev_shared_list = Some(current_list.clone());
            current_list
        }
        Some(ref prev_list) => {
            if &current_list == prev_list {
                vec![]
            } else {
                *prev_shared_list = Some(current_list.clone());
                current_list
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
    let mode = models::TransferMode::Send(file_datas);
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
    let mode = models::TransferMode::Receive;
    start_server(window, mode)
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
    let mut handle_guard = SERVER_HANDLE.lock().unwrap();
    if let Some(server_handle) = handle_guard.take() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            server_handle.stop(true).await;
        });
    }

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
    match mode {
        models::TransferMode::Receive => thread::spawn(move || bcast::emit_info(port, config)),
        models::TransferMode::Send(_) => thread::spawn(|| bcast::recv_emitted_info(window, config)),
    };
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
