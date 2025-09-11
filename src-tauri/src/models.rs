use serde::{Deserialize, Serialize};
use tauri::{Runtime, Window};
use tauri_plugin_fs::SafeFilePath;

use crate::api;

#[derive(Serialize, Clone, Debug)]
pub struct ProgressUpdatePayload {
    pub id: String,
    pub progress: f32,
}

#[derive(Serialize, Deserialize)]
pub struct MulticastPayload {
    pub port: u16,
    pub fingerprint: String,
    pub name: String,
}

#[derive(Debug, Hash, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub ip: String,
    pub port: u16,
    pub name: String,
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
        Self {
            id,
            filepath,
            filename,
            filesize,
        }
    }
}

#[derive(Clone)]
pub enum TransferMode {
    Send(Vec<FileData>),
    Receive,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceConfig {
    pub fingerprint: String,
    pub name: String,
}
