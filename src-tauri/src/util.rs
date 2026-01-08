use rand::{seq::IndexedRandom, Rng};
use tauri::{AppHandle, Manager};

use crate::models;

fn generate_device_name() -> String {
    let words = [
        "Voyager",
        "Pioneer",
        "Explorer",
        "Seeker",
        "Wanderer",
        "Creator",
        "Builder",
        "Maker",
        "Innovator",
        "Dreamer",
        "Guardian",
        "Keeper",
        "Sentinel",
        "Watcher",
        "Guide",
        "Phoenix",
        "Dragon",
        "Griffin",
        "Pegasus",
        "Atlas",
        "Nova",
        "Stellar",
        "Cosmic",
        "Astro",
        "Nebula",
    ];
    let mut rng = rand::rng();
    let random_word = words.choose(&mut rng).unwrap();
    let random_number = rng.random_range(1000..=9999);
    format!("{random_word}#{random_number}")
}

pub fn create_device_config(
    app_handle: &AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    // For HTTPS connections
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .unwrap();

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
        name: generate_device_name(),
    };
    let config_json = serde_json::to_string(&config)?;
    println!("Saving config: {config_json:#?}\nto {config_dir:#?}");
    std::fs::write(config_file_path, config_json)?;
    Ok(())
}
