use std::sync::Arc;

use base64::{Engine, prelude::BASE64_STANDARD};
use eyre::{Result, eyre};
use iroh::{
    EndpointId, RelayConfig, RelayMode, SecretKey, Watcher,
    discovery::pkarr::PkarrPublisher,
    endpoint::{Connection, ConnectionType},
    protocol::Router,
};
use iroh_blobs::{BlobsProtocol, api::Store};
use iroh_gossip::{
    Gossip, TopicId,
    api::{GossipReceiver, GossipSender},
};
use iroh_relay::RelayQuicConfig;
use parking_lot::Mutex;
use person_protocol::{Person, PersonProtocol};
use serde::{Deserialize, Serialize};
use sharded_slab::Slab;
use utils::option_ext::OptionGet;

#[derive(Serialize, Deserialize)]
pub struct Ticket {
    pub id: TopicId,
    pub bootstrap: Vec<EndpointId>,
}

#[derive(Clone)]
pub struct Endpoint {
    router: Router,
    person_protocol: PersonProtocol,
    gossip_protocol: Gossip,
    _blobs_protocol: BlobsProtocol,
    connection_pool: Arc<Slab<Connection>>,
    person_protocol_event: Arc<Mutex<Option<person_protocol::Event>>>,
    group_pool: Arc<Slab<(GossipSender, GossipReceiver)>>,
}
impl Endpoint {
    pub async fn new(secret_key: Vec<u8>, person: Person) -> Result<Self> {
        let relay_map = RelayMode::Default.relay_map();
        relay_map.insert(
            "https://dev.zhangxichang.com:10281".parse()?,
            RelayConfig {
                url: "https://dev.zhangxichang.com:10281".parse()?,
                quic: Some(RelayQuicConfig { port: 10282 }),
            }
            .into(),
        );
        let mut endpoint_builder = iroh::Endpoint::empty_builder(RelayMode::Custom(relay_map))
            .discovery(PkarrPublisher::n0_dns());
        #[cfg(not(target_family = "wasm"))]
        {
            use iroh::discovery::{
                dns::DnsDiscovery, mdns::MdnsDiscovery, pkarr::dht::DhtDiscovery,
            };

            endpoint_builder = endpoint_builder
                .discovery(DnsDiscovery::n0_dns())
                .discovery(MdnsDiscovery::builder())
                .discovery(DhtDiscovery::builder());
        }
        let endpoint = endpoint_builder
            .secret_key(SecretKey::from_bytes(secret_key.as_slice().try_into()?))
            .bind()
            .await?;
        let person_protocol = PersonProtocol::new(endpoint.clone(), person);
        let gossip_protocol = Gossip::builder().spawn(endpoint.clone());
        let store: Store;
        #[cfg(not(target_family = "wasm"))]
        {
            use iroh_blobs::store::fs::FsStore;

            store = FsStore::load("store")
                .await
                .map_err(|err| eyre!(err))?
                .into();
        }
        #[cfg(target_family = "wasm")]
        {
            use iroh_blobs::store::mem::MemStore;

            store = MemStore::new().into();
        }
        let blobs_protocol = BlobsProtocol::new(&store, None);
        let router = Router::builder(endpoint)
            .accept(person_protocol::ALPN, person_protocol.clone())
            .accept(iroh_gossip::ALPN, gossip_protocol.clone())
            .accept(iroh_blobs::ALPN, blobs_protocol.clone())
            .spawn();
        Ok(Self {
            router,
            person_protocol,
            gossip_protocol,
            _blobs_protocol: blobs_protocol,
            connection_pool: Default::default(),
            person_protocol_event: Default::default(),
            group_pool: Default::default(),
        })
    }
    pub async fn close(self) -> Result<()> {
        self.router.shutdown().await?;
        Ok(())
    }
    pub fn id(&self) -> String {
        self.router.endpoint().id().to_string()
    }
    pub async fn person_protocol_next_event(&self) -> Result<()> {
        self.person_protocol_event
            .lock()
            .replace(self.person_protocol.next_event().await?);
        Ok(())
    }
    pub async fn person_protocol_event_type(&self) -> Result<String> {
        Ok(self.person_protocol_event.lock().get()?.to_string())
    }
    pub async fn request_person(&self, id: String) -> Result<Person> {
        Ok(self.person_protocol.request_person(id.parse()?).await?)
    }
    pub async fn request_friend(&self, id: String) -> Result<bool> {
        Ok(self.person_protocol.request_friend(id.parse()?).await?)
    }
    pub async fn request_chat(&self, id: String) -> Result<Option<usize>> {
        Ok(self
            .person_protocol
            .request_chat(id.parse()?)
            .await?
            .map(|v| self.connection_pool.insert(v).get_move())
            .transpose()?)
    }
    pub fn conn_type(&self, id: String) -> Result<Option<String>> {
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
    pub fn latency(&self, id: String) -> Result<Option<usize>> {
        Ok(self
            .router
            .endpoint()
            .latency(id.parse()?)
            .map(|v| v.as_millis() as _))
    }
    pub async fn subscribe_group(&self, ticket: String) -> Result<usize> {
        let ticket = serde_json::from_slice::<Ticket>(&BASE64_STANDARD.decode(ticket)?)?;
        let group = self
            .gossip_protocol
            .subscribe(ticket.id, ticket.bootstrap)
            .await?
            .split();
        Ok(self.group_pool.insert(group).get_move()?)
    }
}

pub fn generate_secret_key() -> Vec<u8> {
    iroh::SecretKey::generate(&mut rand::rng())
        .to_bytes()
        .to_vec()
}
pub fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String> {
    Ok(
        iroh::SecretKey::from_bytes(secret_key.as_slice().try_into()?)
            .public()
            .to_string(),
    )
}
pub fn generate_group_id() -> String {
    TopicId::from_bytes(rand::random()).to_string()
}
pub fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String> {
    Ok(BASE64_STANDARD.encode(serde_json::to_vec(&Ticket {
        id: group_id.parse()?,
        bootstrap: bootstrap
            .into_iter()
            .map(|v| v.parse())
            .collect::<Result<_, _>>()?,
    })?))
}
