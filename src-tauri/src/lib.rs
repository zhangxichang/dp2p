#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut tauri = tauri::Builder::default();
    #[cfg(all(not(debug_assertions), desktop))]
    {
        use tauri::Manager;

        tauri = tauri.plugin(tauri_plugin_single_instance::init(
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
        tauri_plugin_prevent_default =
            tauri_plugin_prevent_default.platform(tauri_plugin_prevent_default::PlatformOptions {
                general_autofill: false,
                password_autosave: false,
            });
    }
    tauri
        .plugin(tauri_plugin_prevent_default.build())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .unwrap();
}
