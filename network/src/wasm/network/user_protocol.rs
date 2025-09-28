use wasm_bindgen::{JsError, JsValue, prelude::wasm_bindgen};

use crate::network::user_protocol;

#[wasm_bindgen]
pub struct Account(user_protocol::Account);
#[wasm_bindgen]
impl Account {
    pub fn new(name: String, avatar: Option<Vec<u8>>) -> Self {
        Self(user_protocol::Account::new(name, avatar))
    }
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.0.id.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.0.name.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn key(&self) -> Vec<u8> {
        self.0.key.to_bytes().to_vec()
    }
    #[wasm_bindgen(getter)]
    pub fn avatar(&self) -> Option<Vec<u8>> {
        self.0.avatar.clone()
    }
    pub fn json(&self) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(&self.0)?)
    }
    pub fn from_json(value: JsValue) -> Result<Self, JsError> {
        Ok(Self(serde_wasm_bindgen::from_value(value)?))
    }
}
impl From<Account> for user_protocol::Account {
    fn from(value: Account) -> Self {
        value.0
    }
}
impl From<user_protocol::Account> for Account {
    fn from(value: user_protocol::Account) -> Self {
        Self(value)
    }
}
