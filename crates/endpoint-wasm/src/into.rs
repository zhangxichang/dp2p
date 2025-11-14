use eyre::Result;
use wasm_bindgen::JsError;

pub trait JsErrorExt<T> {
    fn m(self) -> Result<T, JsError>;
}
impl<T> JsErrorExt<T> for Result<T> {
    fn m(self) -> Result<T, JsError> {
        self.map_err(|err| JsError::new(&err.to_string()))
    }
}
