mod node;
mod utils;

use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub fn wasm_init() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::default());
    log::info!("日志开始记录");
}
