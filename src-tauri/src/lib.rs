//! IPD Library - Inter-Platform Data Transfer
//!
//! This library provides the core functionality for a cross-platform file and text sharing
//! application built with Tauri. It enables peer-to-peer transfer of files and text between
//! devices on the same local network using HTTPS and UDP broadcasting for device discovery.
//!
//! # Architecture
//!
//! - **API Layer** (`api`): Tauri command handlers for frontend communication
//! - **Server Layer** (`server`): Actix-web HTTP server for file/text transfers
//! - **Models** (`models`): Data structures and types used throughout the application
//! - **Utilities** (`util`): Helper functions for device configuration and naming

mod api;
mod models;
mod server;
mod util;

/// Initializes and runs the Tauri application.
///
/// This is the main entry point for the application. It configures the Tauri builder with:
/// - Required plugins (OS, filesystem, dialog, opener, IPD)
/// - Command handlers for frontend-to-backend communication
/// - Device configuration setup during app initialization
///
/// # Panics
///
/// Panics if the Tauri application fails to initialize or run.
///
/// # Platform Support
///
/// On mobile platforms, this function is automatically designated as the entry point
/// via the `#[cfg_attr(mobile, tauri::mobile_entry_point)]` attribute.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_ipd::init())
        .invoke_handler(tauri::generate_handler![
            api::send_file,
            api::send_files_to,
            api::send_text_to,
            api::recv_file,
            api::get_shared_data,
            api::get_device_config,
            api::send_text,
            api::recv_text,
            api::stop_server
        ])
        .setup(|app| util::create_device_config(app.handle()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
