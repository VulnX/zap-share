mod api;
mod models;
mod server;
mod util;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::try_init_from_env(env_logger::Env::new().default_filter_or("info"));
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
            api::recv,
            api::get_shared_data,
            api::get_app_config,
            api::update_app_config,
            api::get_device_config,
            api::send_text,
            api::respond_to_transfer_request,
            api::respond_to_batch_transfer_request,
            api::stop_server
        ])
        .setup(|app| util::init_app_config(app.handle()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
