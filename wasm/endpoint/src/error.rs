use wasm_bindgen::JsError;

pub trait MapJsError<T> {
    fn mje(self) -> Result<T, JsError>;
}
impl<T> MapJsError<T> for Result<T, eyre::Report> {
    fn mje(self) -> Result<T, JsError> {
        self.map_err(|err| JsError::new(&err.to_string()))
    }
}
