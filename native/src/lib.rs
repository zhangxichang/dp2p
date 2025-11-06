mod state;

use crate::state::State;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();
    #[cfg(all(desktop, not(debug_assertions)))]
    {
        use tauri::Manager;

        builder = builder.plugin(tauri_plugin_single_instance::init(
            |tauri_app, _args, _cwd| {
                tauri_app
                    .get_webview_window("main")
                    .unwrap()
                    .set_focus()
                    .unwrap();
            },
        ));
    }
    #[allow(unused_mut)]
    let mut tauri_plugin_prevent_default = tauri_plugin_prevent_default::Builder::new();
    #[cfg(target_os = "windows")]
    {
        tauri_plugin_prevent_default = tauri_plugin_prevent_default.platform(
            tauri_plugin_prevent_default::PlatformOptions::new()
                .general_autofill(false)
                .password_autosave(false),
        );
    }
    builder
        .plugin(tauri_plugin_prevent_default.build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(State::default())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .unwrap();
}
