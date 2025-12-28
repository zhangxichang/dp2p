use bytes::Bytes;
use futures_lite::StreamExt;
use iroh::EndpointId;
use iroh_gossip::{TopicId, api::GossipTopic};
use serde::{Deserialize, Serialize};
use wasm_bindgen::{JsError, JsValue, prelude::wasm_bindgen};
use wasm_bindgen_futures::spawn_local;

use crate::traits::JsErrorExt;

#[derive(Serialize, Deserialize)]
pub struct Ticket {
    pub id: TopicId,
    pub bootstrap: Vec<EndpointId>,
}

#[wasm_bindgen]
pub struct PersonProtocolEvent(person_protocol::Event);
#[wasm_bindgen]
impl PersonProtocolEvent {
    pub fn kind(&self) -> String {
        self.0.to_string()
    }
    pub fn as_friend_request(self) -> Result<FriendRequest, JsError> {
        if let person_protocol::Event::FriendRequest(value) = self.0 {
            Ok(FriendRequest(value))
        } else {
            Err(JsError::new("事件类型错误"))
        }
    }
    pub fn as_chat_request(self) -> Result<ChatRequest, JsError> {
        if let person_protocol::Event::ChatRequest(value) = self.0 {
            Ok(ChatRequest(value))
        } else {
            Err(JsError::new("事件类型错误"))
        }
    }
}
impl From<person_protocol::Event> for PersonProtocolEvent {
    fn from(value: person_protocol::Event) -> Self {
        Self(value)
    }
}

#[wasm_bindgen]
pub struct Person(person_protocol::Person);
#[wasm_bindgen]
impl Person {
    pub fn from_object(value: JsValue) -> Result<Self, JsError> {
        Ok(Self(serde_wasm_bindgen::from_value::<
            person_protocol::Person,
        >(value)?))
    }
    pub fn to_object(&self) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(&self.0)?)
    }
}
impl From<person_protocol::Person> for Person {
    fn from(value: person_protocol::Person) -> Self {
        Self(value)
    }
}
impl From<Person> for person_protocol::Person {
    fn from(value: Person) -> Self {
        value.0
    }
}

#[wasm_bindgen]
pub struct FriendRequest(person_protocol::FriendRequest);
#[wasm_bindgen]
impl FriendRequest {
    pub fn remote_id(&self) -> String {
        self.0.remote_id().to_string()
    }
    pub fn accept(self) -> Result<(), JsError> {
        self.0.accept().m()
    }
    pub fn reject(self) -> Result<(), JsError> {
        self.0.reject().m()
    }
}

#[wasm_bindgen]
pub struct ChatRequest(person_protocol::ChatRequest);
#[wasm_bindgen]
impl ChatRequest {
    pub fn remote_id(&self) -> String {
        self.0.remote_id().to_string()
    }
    pub fn accept(self) -> Result<Connection, JsError> {
        Ok(Connection(self.0.accept().m()?))
    }
    pub fn reject(self) -> Result<(), JsError> {
        self.0.reject().m()
    }
}

#[wasm_bindgen]
pub struct Connection(iroh::endpoint::Connection);
#[wasm_bindgen]
impl Connection {
    pub async fn send(&self, message: String) -> Result<(), JsError> {
        let mut send = self.0.open_uni().await?;
        send.write_all(message.as_bytes()).await?;
        send.finish()?;
        Ok(())
    }
    pub async fn recv(&self) -> Result<Option<String>, JsError> {
        if let Ok(mut recv) = self.0.accept_uni().await {
            if let Ok(message) = recv.read_to_end(usize::MAX).await {
                return Ok(Some(String::from_utf8(message)?));
            }
        }
        Ok(None)
    }
}
impl From<iroh::endpoint::Connection> for Connection {
    fn from(value: iroh::endpoint::Connection) -> Self {
        Self(value)
    }
}

#[wasm_bindgen]
pub struct Group(
    async_channel::Sender<Bytes>,
    async_channel::Receiver<iroh_gossip::api::Event>,
);
#[wasm_bindgen]
impl Group {
    pub async fn next_event(&self) -> Result<Option<JsValue>, JsError> {
        Ok(Some(serde_wasm_bindgen::to_value(&self.1.recv().await?)?))
    }
    pub async fn send(&self, message: String) -> Result<(), JsError> {
        self.0.send(message.into()).await?;
        Ok(())
    }
}
impl From<GossipTopic> for Group {
    fn from(value: GossipTopic) -> Self {
        let mut value = value.split();
        let sender = async_channel::unbounded();
        spawn_local(async move {
            while let Ok(message) = sender.1.recv().await {
                _ = value.0.broadcast(message).await;
            }
        });
        let receiver = async_channel::unbounded();
        spawn_local(async move {
            while let Ok(Some(message)) = value.1.try_next().await {
                _ = receiver.0.send(message).await;
            }
        });
        Self(sender.0, receiver.1)
    }
}
