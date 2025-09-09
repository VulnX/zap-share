use tauri::{AppHandle, Manager};

use crate::models;

pub fn create_device_config(
    app_handle: &AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let config_dir = app_handle.path().app_config_dir()?;
    std::fs::create_dir_all(&config_dir)?; // Ensure exists
    let config_file_path = config_dir.join("config.json");
    if config_file_path.exists() {
        // If already exists, do NOT overwrite
        return Ok(());
    }
    // Default config does not exist yet, create it
    let config = models::DeviceConfig {
        fingerprint: uuid::Uuid::new_v4().to_string(),
    };
    let config_json = serde_json::to_string(&config)?;
    println!("Saving config: {config_json:#?}\nto {config_dir:#?}");
    std::fs::write(config_file_path, config_json)?;
    Ok(())
}
