//! API Command Handlers
//!
//! This module provides all Tauri command handlers that the frontend can invoke.
//! These commands handle file and text transfers in both send and receive modes,
//! device discovery, and server lifecycle management.
//!
//! # Command Categories
//!
//! - **Transfer Commands**: `send_file`, `recv_file`, `send_text`, `recv_text`
//! - **Directed Transfer**: `send_files_to`, `send_text_to` (to specific devices)
//! - **Device Management**: `get_device_config`, `get_shared_data`
//! - **Server Control**: `stop_server`
//!
//! # Global State
//!
//! The module maintains two global static variables:
//! - `SERVER_HANDLE`: Handle to the running Actix-web server for graceful shutdown
//! - `BCAST_THREAD`: Handle to the UDP broadcasting thread for device discovery

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

/// Global handle to the running HTTP server.
///
/// Used to gracefully stop the server when a new transfer is initiated or
/// when the user explicitly stops sharing.
pub static SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::new(None);

/// Global handle to the UDP broadcasting thread.
///
/// Used to signal shutdown and join the thread when stopping device discovery.
pub static BCAST_THREAD: Mutex<Option<models::BroadcastThread>> = Mutex::new(None);

/// Internal state for tracking previously returned shared data.
///
/// Used to prevent returning duplicate shared data from Android's share menu.
static SHARED_DATA: Mutex<Option<Option<tauri_plugin_ipd::SharedData>>> = Mutex::new(None);

/// Retrieves the latest shared data (URIs and/or text) sent to the app via the Android share menu.
///
/// This function checks for new incoming shared data (e.g., content URIs or text) provided
/// through Android's share intents. It returns the data only if it has changed since the last call,
/// preventing redundant processing of the same shared content.
///
/// # Returns
///
/// - `Some(SharedData)` if new shared data (URIs or text) is received.
/// - `None` if the shared data is the same as the previously returned value.
///
/// # Behavior
///
/// - On the first invocation, returns the shared data and stores it internally.
/// - On subsequent invocations, compares the new data to the stored version.
/// - If the data is unchanged, returns `None`.
/// - If the data has changed, returns the new data and updates the stored version.
///
/// # Internals
///
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

/// Starts server in `send` mode to share files with other devices.
///
/// Creates an HTTP server that serves the specified files for download. The server
/// URL is broadcast via UDP so other devices can discover and connect to it.
///
/// # Parameters (from JavaScript/TypeScript)
///
/// - `files`: Array of `[path, name]` tuples:
///
/// # Examples
///
/// ```typescript
/// invoke('send_file', {
///   files: [
///     ['/Users/user/Pictures/photo.jpg', 'photo.jpg'],
///     ['content://com.android.providers...', 'video.mp4']
///   ]
/// });
/// ```
///
/// # Returns
///
/// Success case:
/// ```typescript
/// {
///   "Success": {
///     "ip": String | null, // Automatic IP detection may fail
///     "port": Number
///   }
/// }
/// ```
///
/// Error case:
/// ```typescript
/// { "Error": "<error message>" }
/// ```
///
/// # Implementation Notes
///
/// - Accepts both regular file paths and Android content URIs
/// - Automatically stops any previously running server
/// - Generates unique IDs for each file in the transfer session
#[allow(dead_code)]
#[tauri::command]
pub fn send_file<R: Runtime>(
    window: Window<R>,
    files: Vec<(SafeFilePath, String)>,
) -> models::StartServerResponse {
    // TODO: Add file validation before starting server
    let file_datas: Vec<models::FileData> = files
        .into_iter()
        .map(|(filepath, filename)| models::FileData::from(filepath, filename, &window))
        .collect();
    let mode = models::TransferMode::SendFile(file_datas);
    start_server(window, mode)
}

/// Sends files directly to a specific device.
///
/// Unlike `send_file`, this command sends files directly to a known device
/// without starting a server. The files are uploaded via HTTP POST to the
/// target device's receiving server.
///
/// # Parameters
///
/// - `files`: Array of `[path, name]` tuples (same as `send_file`)
/// - `to`: Server configuration of the target device (IP, port, name)
///
/// # Implementation Notes
///
/// - Reads entire file contents into memory (may not be suitable for very large files)
/// - Uses HTTPS for secure transfer
/// - Sends files sequentially, not in parallel
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
            "https://{}:{}/upload/{}/{}",
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

/// Sends text directly to a specific device.
///
/// Similar to `send_files_to`, but for text content instead of files.
///
/// # Parameters
///
/// - `text`: The text content to send
/// - `to`: Server configuration of the target device
///
/// # Implementation Notes
///
/// - Uses HTTPS for secure transfer
/// - Sends the text as the raw request body
#[allow(dead_code)]
#[tauri::command]
pub async fn send_text_to(text: String, to: models::ServerConfiguration) {
    let client = reqwest::Client::new();
    let endpoint = format!("https://{}:{}/upload", to.ip, to.port);
    println!("sending {text:#?} to {endpoint:#?}");
    client.post(endpoint).body(text).send().await.unwrap();
}

/// Retrieves the device configuration.
///
/// Reads the device's persistent configuration (fingerprint and name) from disk.
///
/// # Returns
///
/// Device configuration containing:
/// - `fingerprint`: Unique device UUID
/// - `name`: Human-friendly device name (e.g., "Voyager#4721")
///
/// # Errors
///
/// Panics if the configuration file cannot be read or parsed. This should not
/// happen in normal operation since the config is created during app initialization.
#[allow(dead_code)]
#[tauri::command]
pub fn get_device_config<R: Runtime>(window: Window<R>) -> models::DeviceConfig {
    let config_dir = window.path().app_config_dir().unwrap();
    let config_file_path = config_dir.join("config.json");
    let config_file_string = std::fs::read_to_string(config_file_path).unwrap();
    let config: models::DeviceConfig = serde_json::from_str(&config_file_string).unwrap();
    config
}

/// Starts server in `receive` mode to accept files from other devices.
///
/// Creates an HTTP server with an upload endpoint. The server URL is broadcast
/// via UDP so other devices can discover and send files to it.
///
/// # Parameters
///
/// No parameters required.
///
/// # Examples
///
/// ```typescript
/// invoke('recv_file');
/// ```
///
/// # Returns
///
/// Success case:
/// ```typescript
/// {
///   "Success": {
///     "ip": String | null, // Automatic IP detection may fail
///     "port": Number
///   }
/// }
/// ```
///
/// Error case:
/// ```typescript
/// { "Error": "<error message>" }
/// ```
///
/// # Implementation Notes
///
/// - Automatically stops any previously running server
/// - Files are saved to the platform-specific downloads directory
/// - Emits progress updates via events during file reception
#[allow(dead_code)]
#[tauri::command]
pub fn recv_file<R: Runtime>(window: Window<R>) -> models::StartServerResponse {
    let mode = models::TransferMode::ReceiveFile;
    start_server(window, mode)
}

/// Starts server in `send text` mode to share text with other devices.
///
/// Similar to `send_file`, but for text content instead of files.
///
/// # Parameters
///
/// - `text`: The text content to share
///
/// # Implementation Notes
///
/// - Text is served as plain text via HTTP GET
/// - Server URL is broadcast for device discovery
#[allow(dead_code)]
#[tauri::command]
pub fn send_text<R: Runtime>(window: Window<R>, text: String) -> models::StartServerResponse {
    let mode = models::TransferMode::SendText(text);
    start_server(window, mode)
}

/// Starts server in `receive text` mode to accept text from other devices.
///
/// Creates an HTTP server that can receive text via POST requests.
///
/// # Implementation Notes
///
/// - Received text is emitted to the frontend via events
/// - Server URL is broadcast for device discovery
#[allow(dead_code)]
#[tauri::command]
pub fn recv_text<R: Runtime>(window: Window<R>) -> models::StartServerResponse {
    let mode = models::TransferMode::ReceiveText;
    start_server(window, mode)
}

/// Stops the currently running server and device discovery.
///
/// This command gracefully shuts down:
/// 1. The HTTP server (if running)
/// 2. The UDP broadcasting thread (if running)
///
/// # Implementation Notes
///
/// - Uses async runtime to call the server's stop method
/// - Signals the broadcast thread to shut down via atomic flag
/// - Joins the broadcast thread to ensure clean shutdown
/// - Ignores errors during thread join (they're logged but not critical)
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
        // Ignore the error
        let _ = bcast_thread.handle.join();
        *thread_guard = None;
    }
}

/// Detects the local IP address of the device.
///
/// This function attempts to automatically detect the device's local IP address.
/// If automatic detection fails (e.g., when the device is using its own hotspot),
/// it manually probes network interfaces to find one with an IP starting with "192.168.".
///
/// # Returns
///
/// The detected local IP address as a string (e.g., "192.168.1.5").
///
/// # Fallback Logic
///
/// 1. Try automatic detection via `local_ip()`
/// 2. If that fails, enumerate all network interfaces
/// 3. Find the first interface with an IP starting with "192.168."
/// 4. Return that IP address
///
/// # Panics
///
/// Panics if no suitable IP address can be found. This is generally safe as
/// it should only occur in very unusual network configurations.
pub fn get_local_ip() -> String {
    // Attempt to automatically detect IP address. If this fails, then manually
    // probe every network interface and attempt to find one with an IP address
    // starting with "192.168.". The `local_ip_address` crate at the moment of
    // writing this code is not able to automatically detect IP address in case
    // the host machine is using its own hotspot, thus this is a minimalistic
    // (and possibly not the most appropriate) method to find a valid candidate.
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
        .unwrap() // Usually does NOT crash, so somewhat safe to use.
}

/// Starts (or restarts) the Actix-web server in a separate thread.
///
/// This is an internal function that handles the common logic for starting
/// the HTTP server in any transfer mode. It:
///
/// 1. Stops any existing server
/// 2. Spawns a new server thread with the specified mode
/// 3. Waits for the server to bind to a port
/// 4. Starts the appropriate UDP broadcasting thread
/// 5. Returns the server's connection information
///
/// # Arguments
///
/// - `window`: Tauri window for file access and event emission
/// - `mode`: Transfer mode (send/receive, file/text)
///
/// # Returns
///
/// - `Success(Url)` if the server started successfully with IP and port
/// - `Error(String)` if the server failed to start within the timeout period
///
/// # Timeout
///
/// Waits up to 10 seconds for the server to start. If it takes longer,
/// returns an error instead of blocking indefinitely.
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

    let ip = get_local_ip();
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

/// Opens a file from a path or content URI.
///
/// This function handles both regular filesystem paths and Android content URIs,
/// providing a unified interface for file access across platforms.
///
/// # Arguments
///
/// - `filepath`: The file path (regular path or content URI)
/// - `window`: Tauri window for accessing the file system plugin
///
/// # Returns
///
/// A tuple of:
/// - Opened file handle
/// - PathBuf representing the file location
///
/// # Platform Differences
///
/// - **Regular paths**: Uses standard `std::fs` operations
/// - **Content URIs (Android)**: Uses Tauri's filesystem plugin to access
///   content provider files
///
/// # Panics
///
/// Panics if the file cannot be opened. In production, this should be
/// replaced with proper error handling.
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
