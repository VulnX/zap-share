//! Utility Functions
//!
//! This module provides utility functions for device configuration and initialization,
//! including device name generation and persistent configuration management.

use rand::{seq::IndexedRandom, Rng};
use tauri::{AppHandle, Manager};

use crate::models;

/// Generates a unique, human-friendly device name.
///
/// The generated name follows the pattern: `Word#Number`, where:
/// - `Word` is randomly selected from a curated list of evocative names
/// - `Number` is a 4-digit random number (1000-9999)
///
/// # Examples
///
/// Generated names might look like:
/// - `Voyager#4721`
/// - `Phoenix#8392`
/// - `Nebula#1056`
///
/// # Returns
///
/// A randomly generated device name string.
fn generate_device_name() -> String {
    // Curated word list for generating memorable device names
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

/// Creates or loads the device configuration file.
///
/// This function is called during application startup to ensure that a valid device
/// configuration exists. If no configuration file is found, it creates one with:
/// - A unique UUID fingerprint for device identification
/// - A randomly generated human-friendly device name
///
/// The configuration is persisted to `{app_config_dir}/config.json`.
///
/// # Implementation Details
///
/// 1. Initializes the default rustls crypto provider for HTTPS support
/// 2. Creates the application config directory if it doesn't exist
/// 3. Checks if a config file already exists
/// 4. If no config exists, generates and saves a new one
/// 5. If config exists, does nothing (preserves existing configuration)
///
/// # Arguments
///
/// * `app_handle` - Reference to the Tauri application handle
///
/// # Returns
///
/// - `Ok(())` if configuration was successfully created or already exists
/// - `Err(error)` if there was an I/O error or path resolution failure
///
/// # Errors
///
/// This function may return errors in the following cases:
/// - Failed to resolve the application config directory path
/// - Failed to create the config directory
/// - Failed to write the configuration file
/// - Failed to serialize the configuration to JSON
pub fn create_device_config(
    app_handle: &AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    // Initialize default crypto provider for HTTPS/TLS connections
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .unwrap();

    let config_dir = app_handle.path().app_config_dir()?;
    std::fs::create_dir_all(&config_dir)?; // Ensure directory exists
    let config_file_path = config_dir.join("config.json");

    if config_file_path.exists() {
        // Configuration already exists, do not overwrite
        return Ok(());
    }

    // Create new device configuration
    let config = models::DeviceConfig {
        fingerprint: uuid::Uuid::new_v4().to_string(),
        name: generate_device_name(),
    };
    let config_json = serde_json::to_string(&config)?;
    println!("Saving config: {config_json:#?}\nto {config_dir:#?}");
    std::fs::write(config_file_path, config_json)?;
    Ok(())
}
