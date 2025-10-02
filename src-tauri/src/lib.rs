mod api;
mod models;
mod server;
mod util;

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
            api::recv_file,
            api::get_shared_data,
            api::get_device_config,
            api::send_text,
            api::recv_text,
        ])
        .setup(|app| util::create_device_config(app.handle()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
