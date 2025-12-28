use std::sync::Arc;

use eyre::{Result, eyre};
use iroh::{RelayConfig, RelayMode, SecretKey, endpoint::Connection, protocol::Router};
use iroh_blobs::{BlobsProtocol, store::fs::FsStore};
use iroh_gossip::Gossip;
use iroh_relay::RelayQuicConfig;
use parking_lot::Mutex;
use person_protocol::{Person, PersonProtocol};
use sharded_slab::Slab;

#[derive(Clone)]
pub struct Endpoint {
    router: Router,
    _person_protocol: PersonProtocol,
    _gossip_protocol: Gossip,
    _blobs_protocol: BlobsProtocol,
    _connection_pool: Arc<Slab<Connection>>,
    _person_protocol_event_receiver: async_channel::Receiver<person_protocol::Event>,
    _person_protocol_event_next: Arc<Mutex<Option<person_protocol::Event>>>,
}
impl Endpoint {
    pub async fn new(secret_key: Vec<u8>, person: Person) -> Result<Self> {
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
        let person_protocol =
            PersonProtocol::new(endpoint.clone(), person, person_protocol_event_sender);
        let gossip_protocol = Gossip::builder().spawn(endpoint.clone());
        let blobs_protocol = BlobsProtocol::new(
            &FsStore::load("store")
                .await
                .map_err(|err| eyre!(err))?
                .into(),
            None,
        );
        let router = Router::builder(endpoint)
            .accept(person_protocol::ALPN, person_protocol.clone())
            .accept(iroh_gossip::ALPN, gossip_protocol.clone())
            .accept(iroh_blobs::ALPN, blobs_protocol.clone())
            .spawn();
        Ok(Self {
            router,
            _person_protocol: person_protocol,
            _gossip_protocol: gossip_protocol,
            _blobs_protocol: blobs_protocol,
            _connection_pool: Default::default(),
            _person_protocol_event_receiver: person_protocol_event_receiver,
            _person_protocol_event_next: Default::default(),
        })
    }
    pub async fn close(&self) -> Result<()> {
        self.router.shutdown().await?;
        Ok(())
    }
}
