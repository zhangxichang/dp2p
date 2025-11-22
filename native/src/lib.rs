mod endpoint;
mod error;
mod file_system;
mod sqlite;
mod state;

use crate::state::State;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    flexi_logger::Logger::with(flexi_logger::LogSpecification::info())
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
        .manage(State::default())
        .invoke_handler(tauri::generate_handler![
            file_system::fs_remove_file,
            file_system::fs_read_file,
            file_system::fs_create_file,
            file_system::fs_exists,
            file_system::fs_remove_dir_all,
            sqlite::sqlite_open,
            sqlite::sqlite_is_open,
            sqlite::sqlite_close,
            sqlite::sqlite_on_update,
            sqlite::sqlite_execute_batch,
            sqlite::sqlite_execute,
            sqlite::sqlite_query,
            endpoint::endpoint_generate_secret_key,
            endpoint::endpoint_get_secret_key_id,
            endpoint::endpoint_event_next,
            endpoint::endpoint_create,
            endpoint::endpoint_is_create,
            endpoint::endpoint_request_person,
            endpoint::endpoint_request_friend,
            endpoint::endpoint_request_chat,
            endpoint::endpoint_connection_type,
            endpoint::endpoint_latency,
            endpoint::event::endpoint_event_as_request_remote_id,
            endpoint::event::endpoint_event_as_request_accept,
            endpoint::event::endpoint_event_as_request_reject,
            endpoint::event::endpoint_event_as_chat_request_accept,
            endpoint::connection::endpoint_connection_send,
            endpoint::connection::endpoint_connection_recv,
        ])
        .run(tauri::generate_context!())
        .unwrap();
}
