use endpoint::service::{ChatRequest, FriendRequest, Person};
use iroh::SecretKey;
use parking_lot::RwLock;
use tokio::sync::mpsc;

use crate::{error::Error, state::State};

#[derive(Default)]
pub struct Endpoint {
    inner: RwLock<Option<endpoint::Endpoint>>,
    friend_request_receiver: RwLock<Option<mpsc::UnboundedReceiver<FriendRequest>>>,
    chat_request_receiver: RwLock<Option<mpsc::UnboundedReceiver<ChatRequest>>>,
}
#[tauri::command(rename_all = "snake_case")]
pub async fn generate_secret_key() -> Result<Vec<u8>, Error> {
    Ok(SecretKey::generate(&mut rand::rng()).to_bytes().to_vec())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String, Error> {
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
    let (friend_request_sender, friend_request_receiver) = mpsc::unbounded_channel();
    state
        .endpoint
        .friend_request_receiver
        .write()
        .replace(friend_request_receiver);
    let (chat_request_sender, chat_request_receiver) = mpsc::unbounded_channel();
    state
        .endpoint
        .chat_request_receiver
        .write()
        .replace(chat_request_receiver);
    let endpoint = endpoint::Endpoint::new(
        secret_key,
        person,
        friend_request_sender,
        chat_request_sender,
    )
    .await?;
    state.endpoint.inner.write().replace(endpoint);
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn endpoint_is_create(state: tauri::State<'_, State>) -> Result<bool, Error> {
    Ok(state.endpoint.inner.read().is_some())
}
