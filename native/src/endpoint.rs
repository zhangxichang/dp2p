pub mod connection;
pub mod event;

use endpoint::service::{Event, Person};
use iroh::{
    SecretKey,
    endpoint::{Connection, ConnectionType},
};
use slab::Slab;
use tokio::sync::{Mutex, mpsc};

use crate::{
    error::{Error, OptionGet, OptionGetClone},
    state::State,
};

#[derive(Default)]
pub struct Endpoint {
    inner: parking_lot::RwLock<Option<endpoint::Endpoint>>,
    event_receiver: Mutex<Option<mpsc::UnboundedReceiver<Event>>>,
    event_next: parking_lot::Mutex<Option<Event>>,
    connections: parking_lot::RwLock<Slab<Connection>>,
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
    state: tauri::State<'_, State>,
    secret_key: Vec<u8>,
    person: Person,
) -> Result<(), Error> {
    let (event_sender, event_receiver) = mpsc::unbounded_channel();
    state
        .endpoint
        .event_receiver
        .lock()
        .await
        .replace(event_receiver);
    let endpoint = endpoint::Endpoint::new(secret_key, person, event_sender).await?;
    state.endpoint.inner.write().replace(endpoint);
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_is_create(state: tauri::State<'_, State>) -> Result<bool, Error> {
    Ok(state.endpoint.inner.read().is_some())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_event_next(state: tauri::State<'_, State>) -> Result<Option<String>, Error> {
    let next = state
        .endpoint
        .event_receiver
        .lock()
        .await
        .get_mut()?
        .recv()
        .await;
    let kind = next.as_ref().map(|v| v.kind());
    *state.endpoint.event_next.lock() = next;
    Ok(kind)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_request_person(
    state: tauri::State<'_, State>,
    id: String,
) -> Result<Person, Error> {
    let endpoint = state.endpoint.inner.read().get_clone()?;
    Ok(endpoint.request_person(id.parse()?).await?)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_request_friend(
    state: tauri::State<'_, State>,
    id: String,
) -> Result<bool, Error> {
    let endpoint = state.endpoint.inner.read().get_clone()?;
    Ok(endpoint.request_friend(id.parse()?).await?)
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_request_chat(
    state: tauri::State<'_, State>,
    id: String,
) -> Result<Option<usize>, Error> {
    let endpoint = state.endpoint.inner.read().get_clone()?;
    Ok(endpoint
        .request_chat(id.parse()?)
        .await?
        .map(|v| state.endpoint.connections.write().insert(v)))
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_connection_type(
    state: tauri::State<'_, State>,
    id: String,
) -> Result<Option<String>, Error> {
    Ok(state
        .endpoint
        .inner
        .read()
        .get()?
        .connection_type(id.parse()?)
        .map(|value| {
            match value {
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
    state: tauri::State<'_, State>,
    id: String,
) -> Result<Option<u128>, Error> {
    Ok(state
        .endpoint
        .inner
        .read()
        .get()?
        .latency(id.parse()?)
        .map(|v| v.as_millis()))
}
