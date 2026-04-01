use std::{
    sync::{atomic::AtomicBool, Arc},
    thread::JoinHandle,
};

use serde::{Deserialize, Serialize};
use tauri::{Runtime, Window};
use tauri_plugin_fs::SafeFilePath;

use crate::api;

#[derive(Serialize, Clone, Debug)]
pub struct ProgressUpdatePayload {
    pub id: String,
    pub filename: String,
    pub progress: f32,
}

#[derive(Serialize, Deserialize)]
pub struct MulticastPayload {
    pub port: u16,
    pub fingerprint: String,
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Hash, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub ip: String,
    pub port: u16,
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Serialize)]
pub struct Url {
    pub ip: String,
    pub port: u16,
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
    pub fn from<R: Runtime>(filepath: SafeFilePath, filename: String, window: &Window<R>) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let (file, _) = api::open_file(&filepath, window);
        let filesize = file.metadata().unwrap().len();
        // TODO: Why not pass the raw File object itself??
        Self {
            id,
            filepath,
            filename,
            filesize,
        }
    }
}

#[derive(Clone)]
pub struct Send {
    pub files: Option<Vec<FileData>>,
    pub text: Option<String>,
}

#[derive(Clone)]
pub enum TransferMode {
    Send(Send),
    Receive,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceConfig {
    pub fingerprint: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransferRequest {
    pub id: String,
    pub device_name: String,
    pub r#type: String, // "file" or "text"
    pub filename: Option<String>,
    pub filesize: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferResponse {
    pub id: String,
    pub accepted: bool,
    pub token: Option<String>,
}

#[derive(Debug)]
pub struct BroadcastThread {
    pub handle: JoinHandle<()>,
    pub shutdown: Arc<AtomicBool>,
}
