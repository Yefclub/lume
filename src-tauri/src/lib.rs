mod ai;
mod okf;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ai_state = ai::AiState::new().expect("falha ao iniciar o backend de IA");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(ai_state)
        .setup(|app| {
            // Após atualizar, o app pode abrir minimizado — força mostrar e focar.
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.maximize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            okf::list_brain_notes,
            okf::read_note,
            okf::save_note,
            okf::create_note,
            okf::delete_note,
            okf::brain_path,
            okf::parse_okf_str,
            ai::list_models,
            ai::model_status,
            ai::download_model,
            ai::chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
