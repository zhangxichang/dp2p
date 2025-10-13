use std::cell::RefCell;

use iroh::NodeId;
use n0_future::{StreamExt, boxed::BoxStream};
use tokio::sync::{mpsc, oneshot};
use tokio_stream::wrappers::UnboundedReceiverStream;
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
pub struct FriendRequest(NodeId, oneshot::Sender<bool>);
#[wasm_bindgen]
impl FriendRequest {
    #[wasm_bindgen(getter)]
    pub fn node_id(&self) -> String {
        self.0.to_string()
    }
    pub fn accept(self) -> Result<(), JsError> {
        self.1
            .send(true)
            .map_err(|_| JsError::new("发送接受好友请求消息失败"))
    }
    pub fn reject(self) -> Result<(), JsError> {
        self.1
            .send(false)
            .map_err(|_| JsError::new("发送拒绝好友请求消息失败"))
    }
}

#[wasm_bindgen]
pub struct Node {
    node: node::Node,
    friend_request_receiver: RefCell<BoxStream<FriendRequest>>,
}
#[wasm_bindgen]
impl Node {
    pub async fn new(secret_key: SecretKey, user_info: UserInfo) -> Result<Self, JsError> {
        let (friend_request_sender, friend_request_receiver) =
            mpsc::unbounded_channel::<(NodeId, oneshot::Sender<bool>)>();
        Ok(Self {
            node: node::Node::new(secret_key.0, user_info.0, friend_request_sender)
                .await
                .mje()?,
            friend_request_receiver: RefCell::new(
                UnboundedReceiverStream::new(friend_request_receiver)
                    .map(|(node_id, sender)| FriendRequest(node_id, sender))
                    .boxed(),
            ),
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
        self.friend_request_receiver.borrow_mut().next().await
    }
}
