mod api;
mod error;
mod option_ext;

use crate::api::Api;

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
        .manage(Api::default())
        .invoke_handler(tauri::generate_handler![
            api::log::log_error,
            api::file_system::fs_remove_file,
            api::file_system::fs_read_file,
            api::file_system::fs_create_file,
            api::file_system::fs_exists,
            api::file_system::fs_remove_dir_all,
            api::sqlite::sqlite_open,
            api::sqlite::sqlite_is_open,
            api::sqlite::sqlite_close,
            api::sqlite::sqlite_on_update,
            api::sqlite::sqlite_execute_batch,
            api::sqlite::sqlite_execute,
            api::sqlite::sqlite_query,
            api::endpoint::endpoint_generate_secret_key,
            api::endpoint::endpoint_get_secret_key_id,
            api::endpoint::endpoint_person_protocol_event_next,
            api::endpoint::endpoint_create,
            api::endpoint::endpoint_close,
            api::endpoint::endpoint_is_create,
            api::endpoint::endpoint_request_person,
            api::endpoint::endpoint_request_friend,
            api::endpoint::endpoint_request_chat,
            api::endpoint::endpoint_conn_type,
            api::endpoint::endpoint_latency,
            api::endpoint::person_protocol_event_next::endpoint_person_protocol_event_next_as_request_remote_id,
            api::endpoint::person_protocol_event_next::endpoint_person_protocol_event_next_as_request_accept,
            api::endpoint::person_protocol_event_next::endpoint_person_protocol_event_next_as_request_reject,
            api::endpoint::person_protocol_event_next::endpoint_person_protocol_event_next_as_chat_request_accept,
            api::endpoint::connection::endpoint_connection_send,
            api::endpoint::connection::endpoint_connection_recv,
        ])
        .run(tauri::generate_context!())
        .unwrap();
}
