use tokio::sync::{Mutex, mpsc::UnboundedReceiver};
use wasm_bindgen::{JsError, prelude::wasm_bindgen};

use crate::{node, service, wasm::utils::MapJsError};

#[wasm_bindgen]
pub struct SecretKey(iroh::SecretKey);
#[wasm_bindgen]
impl SecretKey {
    pub fn new() -> Self {
        Self(iroh::SecretKey::generate(&mut rand::rng()))
    }
    pub fn to_string(&self) -> String {
        self.0.public().to_string()
    }
    pub fn from(key: &[u8]) -> Result<Self, JsError> {
        Ok(Self(iroh::SecretKey::from_bytes(key.try_into()?)))
    }
    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.to_bytes().into()
    }
}

#[wasm_bindgen]
pub struct UserInfo(service::UserInfo);
#[wasm_bindgen]
impl UserInfo {
    pub fn new(name: String, avatar: Option<Vec<u8>>, bio: Option<String>) -> Self {
        Self(service::UserInfo { name, avatar, bio })
    }
    pub fn name(&self) -> String {
        self.0.name.clone()
    }
    pub fn avatar(&self) -> Option<Vec<u8>> {
        self.0.avatar.clone()
    }
    pub fn bio(&self) -> Option<String> {
        self.0.bio.clone()
    }
}

#[wasm_bindgen]
pub struct FriendRequest(service::FriendRequest);
#[wasm_bindgen]
impl FriendRequest {
    pub fn remote_node_id(&self) -> String {
        self.0.remote_node_id().to_string()
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
    pub fn remote_node_id(&self) -> Result<String, JsError> {
        Ok(self.0.remote_node_id().mje()?.to_string())
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
pub struct Node {
    node: node::Node,
    friend_request_receiver: Mutex<UnboundedReceiver<service::FriendRequest>>,
    chat_request_receiver: Mutex<UnboundedReceiver<service::ChatRequest>>,
}
#[wasm_bindgen]
impl Node {
    pub async fn new(secret_key: SecretKey, user_info: UserInfo) -> Result<Self, JsError> {
        let (node, friend_request_receiver, chat_request_receiver) =
            node::Node::new(secret_key.0, user_info.0).await.mje()?;
        Ok(Self {
            node,
            friend_request_receiver: Mutex::new(friend_request_receiver),
            chat_request_receiver: Mutex::new(chat_request_receiver),
        })
    }
    pub fn id(&self) -> String {
        self.node.id().to_string()
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
    pub async fn request_user_info(&self, node_id: String) -> Result<UserInfo, JsError> {
        Ok(UserInfo(
            self.node.request_user_info(node_id.parse()?).await.mje()?,
        ))
    }
    pub async fn request_friend(&self, node_id: String) -> Result<bool, JsError> {
        Ok(self.node.request_friend(node_id.parse()?).await.mje()?)
    }
    pub async fn request_chat(&self, node_id: String) -> Result<Option<Connection>, JsError> {
        Ok(self
            .node
            .request_chat(node_id.parse()?)
            .await
            .mje()?
            .map(|v| Connection(v)))
    }
}
