use std::{cell::RefCell, sync::Arc};

use iroh::endpoint::{RecvStream, SendStream};
use parking_lot::Mutex;
use tokio::sync::mpsc::UnboundedReceiver;
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
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.0.name.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn avatar(&self) -> Option<Vec<u8>> {
        self.0.avatar.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn bio(&self) -> Option<String> {
        self.0.bio.clone()
    }
}

#[wasm_bindgen]
pub struct FriendRequest(service::FriendRequest);
#[wasm_bindgen]
impl FriendRequest {
    #[wasm_bindgen(getter)]
    pub fn node_id(&self) -> String {
        self.0.node_id().to_string()
    }
    pub fn accept(self) -> Result<(), JsError> {
        self.0.accept().mje()
    }
    pub fn reject(self) -> Result<(), JsError> {
        self.0.reject().mje()
    }
}

#[wasm_bindgen]
pub struct Chat(RefCell<SendStream>, RefCell<RecvStream>);
#[wasm_bindgen]
impl Chat {
    pub async fn send(&self, message: String) -> Result<(), JsError> {
        self.0.borrow_mut().write_all(message.as_bytes()).await?;
        self.0.borrow_mut().finish()?;
        Ok(())
    }
    pub async fn recv(&self) -> Result<String, JsError> {
        Ok(String::from_utf8(
            self.1.borrow_mut().read_to_end(usize::MAX).await?,
        )?)
    }
}

#[wasm_bindgen]
pub struct ChatRecv(Arc<Mutex<RecvStream>>);
#[wasm_bindgen]
impl ChatRecv {
    pub async fn recv(&self) -> Result<String, JsError> {
        Ok(String::from_utf8(
            self.0.lock().read_to_end(usize::MAX).await?,
        )?)
    }
}

#[wasm_bindgen]
pub struct Node {
    node: node::Node,
    friend_request_receiver: RefCell<UnboundedReceiver<service::FriendRequest>>,
}
#[wasm_bindgen]
impl Node {
    pub async fn new(secret_key: SecretKey, user_info: UserInfo) -> Result<Self, JsError> {
        let (node, friend_request_receiver) =
            node::Node::new(secret_key.0, user_info.0).await.mje()?;
        Ok(Self {
            node,
            friend_request_receiver: RefCell::new(friend_request_receiver),
        })
    }
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.node.id().to_string()
    }
    pub async fn shutdown(&self) -> Result<(), JsError> {
        Ok(self.node.shutdown().await.mje()?)
    }
    pub async fn request_user_info(&self, node_id: String) -> Result<UserInfo, JsError> {
        Ok(UserInfo(
            self.node.request_user_info(node_id.parse()?).await.mje()?,
        ))
    }
    pub async fn request_friend(&self, node_id: String) -> Result<bool, JsError> {
        Ok(self.node.request_friend(node_id.parse()?).await.mje()?)
    }
    pub async fn friend_request_next(&self) -> Option<FriendRequest> {
        self.friend_request_receiver
            .borrow_mut()
            .recv()
            .await
            .map(|v| FriendRequest(v))
    }
    pub fn set_friends(&self, friends: Vec<String>) -> Result<(), JsError> {
        self.node.set_friends({
            let mut a = vec![];
            for friend in friends {
                a.push(friend.parse()?);
            }
            a
        });
        Ok(())
    }
    pub async fn request_chat(&self, node_id: String) -> Result<Chat, JsError> {
        let (send, recv) = self.node.request_chat(node_id.parse()?).await.mje()?;
        Ok(Chat(RefCell::new(send), RefCell::new(recv)))
    }
    pub fn get_chat_recv(&self, node_id: String) -> Result<Option<ChatRecv>, JsError> {
        Ok(self
            .node
            .get_chat_recv(node_id.parse()?)
            .map(|v| ChatRecv(v)))
    }
}
