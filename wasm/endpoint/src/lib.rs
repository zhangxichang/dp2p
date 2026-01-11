mod traits;

use eyre::Result;
use wasm_bindgen::{JsError, JsValue, prelude::wasm_bindgen};

use crate::traits::JsErrorExt;

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::new(log::Level::Info));
}

#[wasm_bindgen]
pub struct Endpoint(endpoint::Endpoint);
#[wasm_bindgen]
impl Endpoint {
    pub async fn new(secret_key: Vec<u8>, person: JsValue) -> Result<Self, JsError> {
        Ok(Self(
            endpoint::Endpoint::new(secret_key, serde_wasm_bindgen::from_value(person)?)
                .await
                .m()?,
        ))
    }
    pub async fn close(self) -> Result<(), JsError> {
        self.0.close().await.m()?;
        Ok(())
    }
    pub fn id(&self) -> String {
        self.0.id()
    }
    pub async fn person_protocol_next_event(&self) -> Result<(), JsError> {
        self.0.person_protocol_next_event().await.m()?;
        Ok(())
    }
    pub async fn person_protocol_event_type(&self) -> Result<String, JsError> {
        Ok(self.0.person_protocol_event_type().await.m()?)
    }
    pub async fn request_person(&self, id: String) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(
            &self.0.request_person(id).await.m()?,
        )?)
    }
    pub async fn request_friend(&self, id: String) -> Result<bool, JsError> {
        Ok(self.0.request_friend(id).await.m()?)
    }
    pub async fn request_chat(&self, id: String) -> Result<Option<usize>, JsError> {
        Ok(self.0.request_chat(id).await.m()?)
    }
    pub fn conn_type(&self, id: String) -> Result<Option<String>, JsError> {
        Ok(self.0.conn_type(id).m()?)
    }
    pub fn latency(&self, id: String) -> Result<Option<usize>, JsError> {
        Ok(self.0.latency(id).m()?)
    }
    pub async fn subscribe_group(&self, ticket: String) -> Result<usize, JsError> {
        Ok(self.0.subscribe_group(ticket).await.m()?)
    }
}

#[wasm_bindgen]
pub fn generate_secret_key() -> Vec<u8> {
    endpoint::generate_secret_key()
}
#[wasm_bindgen]
pub fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String, JsError> {
    endpoint::get_secret_key_id(secret_key).m()
}
#[wasm_bindgen]
pub fn generate_group_id() -> String {
    endpoint::generate_group_id()
}
#[wasm_bindgen]
pub fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String, JsError> {
    endpoint::generate_ticket(group_id, bootstrap).m()
}
