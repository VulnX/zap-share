//! Data Models and Types
//!
//! This module defines all the data structures and types used throughout the application,
//! including transfer payloads, server configurations, and device metadata.

use std::{
    sync::{atomic::AtomicBool, Arc},
    thread::JoinHandle,
};

use serde::{Deserialize, Serialize};
use tauri::{Runtime, Window};
use tauri_plugin_fs::SafeFilePath;

use crate::api;

/// Progress update payload sent to the frontend during file transfers.
///
/// This structure is emitted via Tauri events to update the UI about
/// ongoing upload or download progress.
///
/// # Fields
///
/// * `id` - Unique identifier for this transfer session
/// * `filename` - Name of the file being transferred
/// * `progress` - Transfer progress as a percentage (0.0 to 100.0)
#[derive(Serialize, Clone, Debug)]
pub struct ProgressUpdatePayload {
    pub id: String,
    pub filename: String,
    pub progress: f32,
}

/// UDP broadcast payload for device discovery.
///
/// This payload is broadcast over UDP to announce the device's presence
/// and server configuration to other devices on the local network.
///
/// # Fields
///
/// * `port` - The port number where the HTTP server is listening
/// * `fingerprint` - Unique device identifier (UUID)
/// * `name` - Human-friendly device name (e.g., "Voyager#4721")
#[derive(Serialize, Deserialize)]
pub struct MulticastPayload {
    pub port: u16,
    pub fingerprint: String,
    pub name: String,
}

/// Server configuration for a discovered device.
///
/// Represents the connection information for a remote device discovered
/// via UDP broadcasting.
///
/// # Fields
///
/// * `ip` - IP address of the remote device
/// * `port` - Port number of the remote device's HTTP server
/// * `name` - Human-friendly name of the remote device
#[derive(Debug, Hash, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub ip: String,
    pub port: u16,
    pub name: String,
}

/// Server URL information.
///
/// Contains the IP address and port where the server is listening.
/// Returned to the frontend when a server is successfully started.
///
/// # Fields
///
/// * `ip` - Local IP address (may be auto-detected)
/// * `port` - Port number assigned to the server
#[derive(Debug, Serialize)]
pub struct Url {
    pub ip: String,
    pub port: u16,
}

/// Response type for server start operations.
///
/// # Variants
///
/// * `Success(Url)` - Server started successfully with connection details
/// * `Error(String)` - Server failed to start with error message
#[derive(Debug, Serialize)]
pub enum StartServerResponse {
    Success(Url),
    Error(String),
}

/// Metadata for a file to be transferred.
///
/// Contains all necessary information about a file that will be sent
/// to another device.
///
/// # Fields
///
/// * `id` - Unique identifier for this file in the current transfer session
/// * `filepath` - Safe file path (regular path or content URI on Android)
/// * `filename` - Display name of the file
/// * `filesize` - Size of the file in bytes
#[derive(Clone, Debug, Serialize)]
pub struct FileData {
    pub id: String,
    pub filepath: SafeFilePath,
    pub filename: String,
    pub filesize: u64,
}

impl FileData {
    /// Creates a new FileData instance from a file path.
    ///
    /// This method generates a unique ID for the file and retrieves its size
    /// from the filesystem (or content provider on Android).
    ///
    /// # Arguments
    ///
    /// * `filepath` - Path to the file (or content URI on Android)
    /// * `filename` - Display name for the file
    /// * `window` - Tauri window reference for file system access
    ///
    /// # Returns
    ///
    /// A new `FileData` instance with populated metadata.
    pub fn from<R: Runtime>(filepath: SafeFilePath, filename: String, window: &Window<R>) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let (file, _) = api::open_file(&filepath, window);
        let filesize = file.metadata().unwrap().len();
        Self {
            id,
            filepath,
            filename,
            filesize,
        }
    }
}

/// Transfer mode determining server behavior.
///
/// Specifies what type of data transfer the server should handle and
/// in which direction (send or receive).
///
/// # Variants
///
/// * `SendFile(Vec<FileData>)` - Server sends the specified files
/// * `ReceiveFile` - Server receives files from remote devices
/// * `SendText(String)` - Server sends text content
/// * `ReceiveText` - Server receives text from remote devices
#[derive(Clone)]
pub enum TransferMode {
    SendFile(Vec<FileData>),
    ReceiveFile,
    SendText(String),
    ReceiveText,
}

/// Persistent device configuration.
///
/// Stored in the application's config directory and contains the device's
/// unique identifier and user-visible name.
///
/// # Fields
///
/// * `fingerprint` - Unique device identifier (UUID), persists across app restarts
/// * `name` - Human-friendly device name (e.g., "Phoenix#8392")
#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceConfig {
    pub fingerprint: String,
    pub name: String,
}

/// Handle for a running broadcast thread.
///
/// Contains the thread handle and a shutdown signal for graceful termination
/// of the UDP broadcasting thread.
///
/// # Fields
///
/// * `handle` - Join handle for the broadcast thread
/// * `shutdown` - Atomic flag to signal thread shutdown
#[derive(Debug)]
pub struct BroadcastThread {
    pub handle: JoinHandle<()>,
    pub shutdown: Arc<AtomicBool>,
}
