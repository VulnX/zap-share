use log::{debug, info};
use rand::{seq::IndexedRandom, Rng};
use tauri::{AppHandle, Manager};

use crate::models;

fn generate_device_name() -> String {
    debug!("Generating random device name...");
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
    let name = format!("{random_word}#{random_number}");
    debug!("Generated device name: {}", name);
    name
}

pub fn init_app_config(
    app_handle: &AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    // For HTTPS connections
    let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();

    let config_dir = app_handle.path().app_config_dir()?;
    debug!("Using config directory: {:?}", config_dir);
    std::fs::create_dir_all(&config_dir)?; // Ensure exists
    let app_config_path = config_dir.join("app_config.json");
    let old_config_path = config_dir.join("config.json");

    if app_config_path.exists() {
        debug!("App configuration file already exists at {:?}", app_config_path);
        // Clean up old config if it somehow persists
        if old_config_path.exists() {
            debug!("Removing old config.json as app_config.json exists");
            let _ = std::fs::remove_file(old_config_path);
        }
        return Ok(());
    }

    debug!("App config file not found, creating default...");
    let mut fingerprint = uuid::Uuid::new_v4().to_string();
    let mut name = generate_device_name();

    // Migration logic
    #[derive(serde::Deserialize)]
    struct LegacyDeviceConfig {
        fingerprint: String,
        name: String,
    }

    if old_config_path.exists() {
        debug!("Found old config.json, migrating...");
        if let Ok(content) = std::fs::read_to_string(&old_config_path) {
            if let Ok(old_config) = serde_json::from_str::<LegacyDeviceConfig>(&content) {
                fingerprint = old_config.fingerprint;
                name = old_config.name;
                debug!("Migrated fingerprint and name from old config");
            }
        }
        let _ = std::fs::remove_file(old_config_path);
    }

    let config = models::AppConfig {
        fingerprint,
        device_name: name,
        preferred_port: 0,
        encryption: false,
        nearby_share: true,
    };

    let config_json = serde_json::to_string_pretty(&config)?;
    info!("Saving app config: {config_json}\nto {app_config_path:?}");
    std::fs::write(app_config_path, config_json)?;
    Ok(())
}
