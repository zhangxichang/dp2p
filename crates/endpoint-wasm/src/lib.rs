use base64::{Engine, prelude::BASE64_STANDARD};
use eyre::Result;
use futures_lite::StreamExt;
use iroh::{
    EndpointId, RelayConfig, RelayMap, RelayMode, SecretKey, Watcher,
    endpoint::{Connection as RawConnection, ConnectionType},
    protocol::Router,
};
use iroh_blobs::{BlobsProtocol, store::mem::MemStore};
use iroh_gossip::{
    Gossip, TopicId,
    api::{GossipReceiver, GossipSender},
};
use iroh_relay::RelayQuicConfig;
use person_protocol::PersonProtocol;
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, mpsc};
use wasm_bindgen::{JsError, JsValue, prelude::wasm_bindgen};

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::new(log::Level::Info));
}

pub trait JsErrorExt<T> {
    fn m(self) -> Result<T, JsError>;
}
impl<T> JsErrorExt<T> for Result<T> {
    fn m(self) -> Result<T, JsError> {
        self.map_err(|err| JsError::new(&err.to_string()))
    }
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
pub struct Connection(RawConnection);
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

#[wasm_bindgen]
pub struct Group(GossipSender, Mutex<GossipReceiver>);
#[wasm_bindgen]
impl Group {
    pub async fn next_event(&self) -> Result<Option<JsValue>, JsError> {
        let Some(event) = self.1.lock().await.try_next().await? else {
            return Ok(None);
        };
        Ok(Some(serde_wasm_bindgen::to_value(&event)?))
    }
    pub async fn send(&self, message: String) -> Result<(), JsError> {
        self.0.broadcast(message.into()).await?;
        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
pub struct Ticket {
    pub id: TopicId,
    pub bootstrap: Vec<EndpointId>,
}

#[wasm_bindgen]
pub struct Endpoint {
    router: Router,
    person_protocol: PersonProtocol,
    person_protocol_event_receiver: Mutex<mpsc::UnboundedReceiver<person_protocol::Event>>,
    gossip_protocol: Gossip,
    _blobs_protocol: BlobsProtocol,
}
#[wasm_bindgen]
impl Endpoint {
    pub async fn new(secret_key: Vec<u8>, person: Person) -> Result<Self, JsError> {
        let (person_protocol_event_sender, person_protocol_event_receiver) =
            mpsc::unbounded_channel();
        let endpoint = iroh::Endpoint::builder()
            .relay_mode(RelayMode::Custom(RelayMap::from_iter([RelayConfig {
                url: "https://dev.zhangxichang.com:10281".parse()?,
                quic: Some(RelayQuicConfig { port: 10282 }),
            }])))
            .secret_key(SecretKey::from_bytes(secret_key.as_slice().try_into()?))
            .bind()
            .await?;
        let person_protocol =
            PersonProtocol::new(endpoint.clone(), person.0, person_protocol_event_sender);
        let gossip_protocol = Gossip::builder().spawn(endpoint.clone());
        let blobs_protocol = BlobsProtocol::new(&MemStore::new(), None);
        let router = Router::builder(endpoint)
            .accept(person_protocol::ALPN, person_protocol.clone())
            .accept(iroh_gossip::ALPN, gossip_protocol.clone())
            .accept(iroh_blobs::ALPN, blobs_protocol.clone())
            .spawn();
        Ok(Self {
            router,
            person_protocol,
            person_protocol_event_receiver: Mutex::new(person_protocol_event_receiver),
            gossip_protocol,
            _blobs_protocol: blobs_protocol,
        })
    }
    pub fn id(&self) -> String {
        self.router.endpoint().id().to_string()
    }
    pub async fn person_protocol_event_next(&self) -> Option<PersonProtocolEvent> {
        self.person_protocol_event_receiver
            .lock()
            .await
            .recv()
            .await
            .map(|v| PersonProtocolEvent(v))
    }
    pub async fn request_person(&self, id: String) -> Result<Person, JsError> {
        Ok(Person(
            self.person_protocol.request_person(id.parse()?).await.m()?,
        ))
    }
    pub async fn request_friend(&self, id: String) -> Result<bool, JsError> {
        Ok(self.person_protocol.request_friend(id.parse()?).await.m()?)
    }
    pub async fn request_chat(&self, id: String) -> Result<Option<Connection>, JsError> {
        Ok(self
            .person_protocol
            .request_chat(id.parse()?)
            .await
            .m()?
            .map(|v| Connection(v)))
    }
    pub fn conn_type(&self, id: String) -> Result<Option<String>, JsError> {
        Ok(self
            .router
            .endpoint()
            .conn_type(id.parse()?)
            .map(|mut value| {
                match value.get() {
                    ConnectionType::Direct(_) => "Direct",
                    ConnectionType::Relay(_) => "Relay",
                    ConnectionType::Mixed(_, _) => "Mixed",
                    ConnectionType::None => "None",
                }
                .to_string()
            }))
    }
    pub fn latency(&self, id: String) -> Result<Option<usize>, JsError> {
        Ok(self
            .router
            .endpoint()
            .latency(id.parse()?)
            .map(|v| v.as_millis() as _))
    }
    pub async fn subscribe_group(&self, ticket: String) -> Result<Group, JsError> {
        let ticket = serde_json::from_slice::<Ticket>(&BASE64_STANDARD.decode(ticket)?)?;
        let (sender, receiver) = self
            .gossip_protocol
            .subscribe(ticket.id, ticket.bootstrap)
            .await?
            .split();
        Ok(Group(sender, Mutex::new(receiver)))
    }
}

#[wasm_bindgen]
pub fn generate_secret_key() -> Vec<u8> {
    iroh::SecretKey::generate(&mut rand::rng())
        .to_bytes()
        .to_vec()
}
#[wasm_bindgen]
pub fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String, JsError> {
    Ok(
        iroh::SecretKey::from_bytes(secret_key.as_slice().try_into()?)
            .public()
            .to_string(),
    )
}
#[wasm_bindgen]
pub fn generate_group_id() -> String {
    TopicId::from_bytes(rand::random()).to_string()
}
#[wasm_bindgen]
pub fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String, JsError> {
    Ok(BASE64_STANDARD.encode(serde_json::to_vec(&Ticket {
        id: group_id.parse()?,
        bootstrap: bootstrap
            .into_iter()
            .map(|v| v.parse())
            .collect::<Result<_, _>>()?,
    })?))
}
