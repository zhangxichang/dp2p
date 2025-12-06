pub mod connection;
pub mod person_protocol_event_next;

use std::sync::Arc;

use iroh::{
    SecretKey, Watcher,
    endpoint::{Connection, ConnectionType},
    protocol::Router,
};
use iroh_blobs::{BlobsProtocol, store::fs::FsStore};
use iroh_gossip::Gossip;
use parking_lot::RwLock;
use person_protocol::{Person, PersonProtocol};
use slab::Slab;
use tokio::sync::mpsc;

use crate::{
    api::Api,
    error::Error,
    option_ext::{OptionGet, OptionGetClone},
};

#[derive(Clone)]
struct Inner {
    router: Router,
    person_protocol: PersonProtocol,
    _gossip_protocol: Gossip,
    _blobs_protocol: BlobsProtocol,
    connections: Slab<Connection>,
    person_protocol_event_receiver:
        Arc<tokio::sync::Mutex<mpsc::UnboundedReceiver<person_protocol::Event>>>,
    person_protocol_event_next: Arc<parking_lot::Mutex<Option<person_protocol::Event>>>,
}

#[derive(Default)]
pub struct Endpoint {
    inner: RwLock<Option<Inner>>,
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_generate_secret_key() -> Result<Vec<u8>, Error> {
    Ok(SecretKey::generate(&mut rand::rng()).to_bytes().to_vec())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_get_secret_key_id(secret_key: Vec<u8>) -> Result<String, Error> {
    Ok(SecretKey::from_bytes(secret_key.as_slice().try_into()?)
        .public()
        .to_string())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_create(
    api: tauri::State<'_, Api>,
    secret_key: Vec<u8>,
    person: Person,
) -> Result<(), Error> {
    let (person_protocol_event_sender, person_protocol_event_receiver) = mpsc::unbounded_channel();
    let endpoint = iroh::Endpoint::builder()
        .secret_key(SecretKey::from_bytes(secret_key.as_slice().try_into()?))
        .bind()
        .await?;
    let person_protocol =
        PersonProtocol::new(endpoint.clone(), person, person_protocol_event_sender);
    let gossip_protocol = Gossip::builder().spawn(endpoint.clone());
    let blobs_protocol = BlobsProtocol::new(
        &FsStore::load("store")
            .await
            .map_err(|err| Error::from(err.to_string()))?
            .into(),
        None,
    );
    api.endpoint.inner.write().replace(Inner {
        router: Router::builder(endpoint)
            .accept(person_protocol::ALPN, person_protocol.clone())
            .accept(iroh_gossip::ALPN, gossip_protocol.clone())
            .accept(iroh_blobs::ALPN, blobs_protocol.clone())
            .spawn(),
        person_protocol,
        _gossip_protocol: gossip_protocol,
        _blobs_protocol: blobs_protocol,
        connections: Default::default(),
        person_protocol_event_receiver: Arc::new(tokio::sync::Mutex::new(
            person_protocol_event_receiver,
        )),
        person_protocol_event_next: Default::default(),
    });
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_close(api: tauri::State<'_, Api>) -> Result<(), Error> {
    api.endpoint.inner.write().take();
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_is_create(api: tauri::State<'_, Api>) -> Result<bool, Error> {
    Ok(api.endpoint.inner.read().is_some())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_person_protocol_event_next(
    api: tauri::State<'_, Api>,
) -> Result<Option<String>, Error> {
    let inner = api.endpoint.inner.read().get_clone()?;
    let next = inner
        .person_protocol_event_receiver
        .lock()
        .await
        .recv()
        .await;
    let kind = next.as_ref().map(|v| v.to_string());
    *inner.person_protocol_event_next.lock() = next;
    Ok(kind)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_request_person(
    api: tauri::State<'_, Api>,
    id: String,
) -> Result<Person, Error> {
    let inner = api.endpoint.inner.read().get_clone()?;
    Ok(inner.person_protocol.request_person(id.parse()?).await?)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_request_friend(
    api: tauri::State<'_, Api>,
    id: String,
) -> Result<bool, Error> {
    let inner = api.endpoint.inner.read().get_clone()?;
    Ok(inner.person_protocol.request_friend(id.parse()?).await?)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_request_chat(
    api: tauri::State<'_, Api>,
    id: String,
) -> Result<Option<usize>, Error> {
    let mut inner = api.endpoint.inner.read().get_clone()?;
    Ok(inner
        .person_protocol
        .request_chat(id.parse()?)
        .await?
        .map(|v| inner.connections.insert(v)))
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_conn_type(
    api: tauri::State<'_, Api>,
    id: String,
) -> Result<Option<String>, Error> {
    Ok(api
        .endpoint
        .inner
        .read()
        .get()?
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
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_latency(
    api: tauri::State<'_, Api>,
    id: String,
) -> Result<Option<u128>, Error> {
    Ok(api
        .endpoint
        .inner
        .read()
        .get()?
        .router
        .endpoint()
        .latency(id.parse()?)
        .map(|v| v.as_millis()))
}
