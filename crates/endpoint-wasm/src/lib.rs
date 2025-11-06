mod error;

use endpoint::{self, service};
use tokio::sync::{Mutex, mpsc};
use wasm_bindgen::{JsError, JsValue, prelude::wasm_bindgen};

use crate::error::MapJsError;

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::new(log::Level::Info));
}

#[wasm_bindgen]
pub enum ConnectionType {
    None,
    Direct,
    Relay,
    Mixed,
}
impl From<iroh::endpoint::ConnectionType> for ConnectionType {
    fn from(value: iroh::endpoint::ConnectionType) -> Self {
        match value {
            iroh::endpoint::ConnectionType::Direct(_) => Self::Direct,
            iroh::endpoint::ConnectionType::Relay(_) => Self::Relay,
            iroh::endpoint::ConnectionType::Mixed(_, _) => Self::Mixed,
            iroh::endpoint::ConnectionType::None => Self::None,
        }
    }
}

#[wasm_bindgen]
pub struct UserInfo(service::UserInfo);
#[wasm_bindgen]
impl UserInfo {
    pub fn from_object(value: JsValue) -> Result<Self, JsError> {
        Ok(Self(serde_wasm_bindgen::from_value::<service::UserInfo>(
            value,
        )?))
    }
    pub fn to_object(&self) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(&self.0)?)
    }
}

#[wasm_bindgen]
pub struct FriendRequest(service::FriendRequest);
#[wasm_bindgen]
impl FriendRequest {
    pub fn remote_id(&self) -> String {
        self.0.remote_id().to_string()
    }
    pub fn accept(self) -> Result<(), JsError> {
        self.0.accept().mje()
    }
    pub fn reject(self) -> Result<(), JsError> {
        self.0.reject().mje()
    }
}

#[wasm_bindgen]
pub struct ChatRequest(service::ChatRequest);
#[wasm_bindgen]
impl ChatRequest {
    pub fn remote_id(&self) -> String {
        self.0.remote_id().to_string()
    }
    pub fn accept(self) -> Result<Connection, JsError> {
        Ok(Connection(self.0.accept().mje()?))
    }
    pub fn reject(self) -> Result<(), JsError> {
        self.0.reject().mje()
    }
}

#[wasm_bindgen]
pub struct Connection(iroh::endpoint::Connection);
#[wasm_bindgen]
impl Connection {
    pub async fn send(&self, data: String) -> Result<(), JsError> {
        let mut send = self.0.open_uni().await?;
        send.write_all(data.as_bytes()).await?;
        send.finish()?;
        Ok(())
    }
    pub async fn read(&self) -> Result<Option<String>, JsError> {
        if let Ok(mut recv) = self.0.accept_uni().await {
            if let Ok(data) = recv.read_to_end(usize::MAX).await {
                return Ok(Some(String::from_utf8(data)?));
            }
        }
        Ok(None)
    }
}

#[wasm_bindgen]
pub struct Endpoint {
    endpoint: endpoint::Endpoint,
    friend_request_receiver: Mutex<mpsc::UnboundedReceiver<service::FriendRequest>>,
    chat_request_receiver: Mutex<mpsc::UnboundedReceiver<service::ChatRequest>>,
}
#[wasm_bindgen]
impl Endpoint {
    pub async fn new(secret_key: Vec<u8>, user_info: UserInfo) -> Result<Self, JsError> {
        let (friend_request_sender, friend_request_receiver) = mpsc::unbounded_channel();
        let (chat_request_sender, chat_request_receiver) = mpsc::unbounded_channel();
        Ok(Self {
            endpoint: endpoint::Endpoint::new(
                secret_key,
                user_info.0,
                friend_request_sender,
                chat_request_sender,
            )
            .await
            .mje()?,
            friend_request_receiver: Mutex::new(friend_request_receiver),
            chat_request_receiver: Mutex::new(chat_request_receiver),
        })
    }
    pub fn id(&self) -> String {
        self.endpoint.id().to_string()
    }
    pub fn connection_type(&self, id: String) -> Result<Option<ConnectionType>, JsError> {
        Ok(self.endpoint.connection_type(id.parse()?).map(Into::into))
    }
    pub fn latency(&self, id: String) -> Result<Option<usize>, JsError> {
        Ok(self
            .endpoint
            .latency(id.parse()?)
            .map(|v| v.as_millis() as _))
    }
    pub async fn friend_request_next(&self) -> Option<FriendRequest> {
        self.friend_request_receiver
            .lock()
            .await
            .recv()
            .await
            .map(|v| FriendRequest(v))
    }
    pub async fn chat_request_next(&self) -> Option<ChatRequest> {
        self.chat_request_receiver
            .lock()
            .await
            .recv()
            .await
            .map(|v| ChatRequest(v))
    }
    pub async fn request_user_info(&self, id: String) -> Result<UserInfo, JsError> {
        Ok(UserInfo(
            self.endpoint.request_user_info(id.parse()?).await.mje()?,
        ))
    }
    pub async fn request_friend(&self, id: String) -> Result<bool, JsError> {
        Ok(self.endpoint.request_friend(id.parse()?).await.mje()?)
    }
    pub async fn request_chat(&self, id: String) -> Result<Option<Connection>, JsError> {
        Ok(self
            .endpoint
            .request_chat(id.parse()?)
            .await
            .mje()?
            .map(|v| Connection(v)))
    }
}

#[wasm_bindgen]
pub fn generate_secret_key() -> Vec<u8> {
    iroh::SecretKey::generate(&mut rand::rng())
        .to_bytes()
        .to_vec()
}
#[wasm_bindgen]
pub fn get_secret_key_id(bytes: &[u8]) -> Result<String, JsError> {
    Ok(iroh::SecretKey::from_bytes(bytes.try_into()?)
        .public()
        .to_string())
}
