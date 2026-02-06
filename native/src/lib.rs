mod router;

use tauri::Manager;

pub use crate::router::router;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn entry() {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            main().await;
        })
}
async fn main() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();
    #[cfg(all(desktop, not(debug_assertions)))]
    {
        use tauri::Manager;

        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            app.get_webview_window("main").unwrap().set_focus().unwrap();
        }));
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
        .setup(|app| {
            flexi_logger::Logger::with(flexi_logger::LogSpecification::info())
                .log_to_file(
                    flexi_logger::FileSpec::default()
                        .directory(app.path().app_log_dir()?)
                        .suppress_basename(),
                )
                .format(flexi_logger::json_format)
                .rotate(
                    flexi_logger::Criterion::Size(1024 * 1024),
                    flexi_logger::Naming::Timestamps,
                    flexi_logger::Cleanup::KeepCompressedFiles(10),
                )
                .start()?;
            log::info!("日志开始记录");
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap();
}
