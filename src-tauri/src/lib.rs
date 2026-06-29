mod okf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            okf::list_brain_notes,
            okf::read_note,
            okf::save_note,
            okf::create_note,
            okf::delete_note,
            okf::brain_path,
            okf::parse_okf_str
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
