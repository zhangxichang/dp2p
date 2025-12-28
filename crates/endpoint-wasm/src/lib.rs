mod traits;
mod types;
mod utils;

use base64::{Engine, prelude::BASE64_STANDARD};
use eyre::Result;
use iroh::{
    RelayConfig, RelayMode, SecretKey, Watcher, endpoint::ConnectionType, protocol::Router,
};
use iroh_blobs::{BlobsProtocol, store::mem::MemStore};
use iroh_gossip::Gossip;
use iroh_relay::RelayQuicConfig;
use person_protocol::PersonProtocol;
use wasm_bindgen::{JsError, prelude::wasm_bindgen};

use crate::{
    traits::JsErrorExt,
    types::{Connection, Group, Person, PersonProtocolEvent, Ticket},
};

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::new(log::Level::Info));
}

#[wasm_bindgen]
pub struct Endpoint {
    router: Router,
    person_protocol: PersonProtocol,
    person_protocol_event_receiver: async_channel::Receiver<person_protocol::Event>,
    gossip_protocol: Gossip,
    _blobs_protocol: BlobsProtocol,
}
#[wasm_bindgen]
impl Endpoint {
    pub async fn new(secret_key: Vec<u8>, person: Person) -> Result<Self, JsError> {
        let (person_protocol_event_sender, person_protocol_event_receiver) =
            async_channel::unbounded();
        let relay_map = RelayMode::Default.relay_map();
        relay_map.insert(
            "https://dev.zhangxichang.com:10281".parse()?,
            RelayConfig {
                url: "https://dev.zhangxichang.com:10281".parse()?,
                quic: Some(RelayQuicConfig { port: 10282 }),
            }
            .into(),
        );
        let endpoint = iroh::Endpoint::builder()
            .relay_mode(RelayMode::Custom(relay_map))
            .secret_key(SecretKey::from_bytes(secret_key.as_slice().try_into()?))
            .bind()
            .await?;
        let person_protocol = PersonProtocol::new(
            endpoint.clone(),
            person.into(),
            person_protocol_event_sender,
        );
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
            person_protocol_event_receiver,
            gossip_protocol,
            _blobs_protocol: blobs_protocol,
        })
    }
    pub async fn close(self) -> Result<(), JsError> {
        self.router.shutdown().await?;
        Ok(())
    }
    pub fn id(&self) -> String {
        self.router.endpoint().id().to_string()
    }
    pub async fn person_protocol_event_next(&self) -> Result<PersonProtocolEvent, JsError> {
        Ok(self.person_protocol_event_receiver.recv().await?.into())
    }
    pub async fn request_person(&self, id: String) -> Result<Person, JsError> {
        Ok(self
            .person_protocol
            .request_person(id.parse()?)
            .await
            .m()?
            .into())
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
            .map(|v| v.into()))
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
        Ok(self
            .gossip_protocol
            .subscribe(ticket.id, ticket.bootstrap)
            .await?
            .into())
    }
}
