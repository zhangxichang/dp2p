mod api;
mod option_ext;
mod router;
mod sqlite;

pub use crate::router::router;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    flexi_logger::Logger::with(flexi_logger::LogSpecification::info())
        .log_to_file(
            flexi_logger::FileSpec::default()
                .directory("logs")
                .suppress_basename(),
        )
        .format(flexi_logger::json_format)
        .rotate(
            flexi_logger::Criterion::Size(1024 * 1024),
            flexi_logger::Naming::Timestamps,
            flexi_logger::Cleanup::KeepCompressedFiles(10),
        )
        .start()
        .unwrap();
    log::info!("日志开始记录");
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
        .invoke_handler(router().into_handler())
        .run(tauri::generate_context!())
        .unwrap();
}
