use app_lib::router;
use tauri::test::mock_builder;

#[tokio::main]
async fn main() {
    std::env::set_current_dir(env!("CARGO_PKG_NAME")).unwrap();
    mock_builder()
        .invoke_handler(router().into_handler())
        .build(tauri::generate_context!())
        .unwrap();
}
