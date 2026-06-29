mod ai;
mod okf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ai_state = ai::AiState::new().expect("falha ao iniciar o backend de IA");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(ai_state)
        .invoke_handler(tauri::generate_handler![
            okf::list_brain_notes,
            okf::read_note,
            okf::save_note,
            okf::create_note,
            okf::delete_note,
            okf::brain_path,
            okf::parse_okf_str,
            ai::model_status,
            ai::download_model,
            ai::chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
