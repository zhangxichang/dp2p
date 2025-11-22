pub mod service;

use std::time::Duration;

use eyre::Result;
use iroh::{
    EndpointId, SecretKey, Watcher,
    endpoint::{Connection, ConnectionType},
    protocol::Router,
};
use iroh_blobs::{BlobsProtocol, store::mem::MemStore};
use tokio::sync::mpsc;

use crate::service::{Event, Person, SERVICE_ALPN, Service};

#[derive(Clone)]
pub struct Endpoint {
    router: Router,
    service: Service,
    _blobs: BlobsProtocol,
}
impl Endpoint {
    pub async fn new(
        secret_key: Vec<u8>,
        person: Person,
        event_sender: mpsc::UnboundedSender<Event>,
    ) -> Result<Self> {
        let endpoint = iroh::Endpoint::builder()
            .secret_key(SecretKey::from_bytes(secret_key.as_slice().try_into()?))
            .bind()
            .await?;
        let service = Service::new(endpoint.clone(), person, event_sender);
        let blobs = BlobsProtocol::new(&MemStore::new(), None);
        Ok(Self {
            router: Router::builder(endpoint)
                .accept(SERVICE_ALPN, service.clone())
                .accept(iroh_blobs::ALPN, blobs.clone())
                .spawn(),
            service,
            _blobs: blobs,
        })
    }
    pub fn id(&self) -> EndpointId {
        self.router.endpoint().id()
    }
    pub async fn request_person(&self, id: EndpointId) -> Result<Person> {
        self.service.request_person(id).await
    }
    pub async fn request_friend(&self, id: EndpointId) -> Result<bool> {
        self.service.request_friend(id).await
    }
    pub async fn request_chat(&self, id: EndpointId) -> Result<Option<Connection>> {
        self.service.request_chat(id).await
    }
    pub fn connection_type(&self, id: EndpointId) -> Option<ConnectionType> {
        self.router.endpoint().conn_type(id).map(|mut v| v.get())
    }
    pub fn latency(&self, id: EndpointId) -> Option<Duration> {
        self.router.endpoint().latency(id)
    }
}
