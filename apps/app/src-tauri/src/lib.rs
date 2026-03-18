mod commands;
mod license;
mod hardware;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_hardware_fingerprint,
            commands::check_license,
            commands::activate_license,
            commands::open_mirath_file,
            commands::save_mirath_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
