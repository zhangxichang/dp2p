use std::sync::Arc;

use eyre::Result;
use iroh::{
    Endpoint, PublicKey, SecretKey,
    endpoint::Connection,
    protocol::{AcceptError, ProtocolHandler},
};
use protocol::{AcceptMessage, AcceptMessageFlags, Packet, User, prost::Message};
use serde::{Deserialize, Serialize};
use wasm_bindgen_futures::spawn_local;

pub const ALPN: &[u8] = b"user/v1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub key: SecretKey,
    pub avatar: Option<Vec<u8>>,
}
impl Account {
    pub fn new(name: impl AsRef<str>, avatar: Option<impl AsRef<[u8]>>) -> Self {
        let key = SecretKey::generate(rand_0_8_5::rngs::OsRng);
        Self {
            id: key.public().to_string(),
            name: name.as_ref().to_string(),
            key,
            avatar: avatar.map(|v| v.as_ref().to_vec()),
        }
    }
}
impl From<Account> for User {
    fn from(value: Account) -> Self {
        Self {
            id: value.id,
            name: value.name,
            avatar: value.avatar,
        }
    }
}

#[derive(Debug, Clone)]
pub struct UserProtocol {
    endpoint: Endpoint,
    pub account: Arc<Account>,
}
impl UserProtocol {
    pub fn new(endpoint: Endpoint, account: Account) -> Self {
        Self {
            endpoint,
            account: Arc::new(account),
        }
    }
    async fn handle_connection(&self, connection: Connection) {
        while let Ok((mut send, mut recv)) = connection.accept_bi().await {
            spawn_local({
                let account = self.account.clone();
                async move {
                    async move {
                        match Packet::decode(recv.read_to_end(usize::MAX).await?.as_ref())?
                            .message
                            .unwrap()
                            .flags()
                        {
                            AcceptMessageFlags::RequestUserInfo => {
                                send.write_all(&User::from((*account).clone()).encode_to_vec())
                                    .await?;
                                send.finish()?;
                            }
                        }
                        eyre::Ok(())
                    }
                    .await
                    .unwrap()
                }
            });
        }
    }
    pub async fn request_user_info(&self, user_id: impl AsRef<str>) -> Result<User> {
        let connection = self
            .endpoint
            .connect(user_id.as_ref().parse::<PublicKey>()?, ALPN)
            .await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(
            &Packet {
                message: Some(AcceptMessage {
                    flags: AcceptMessageFlags::RequestUserInfo as _,
                }),
            }
            .encode_to_vec(),
        )
        .await?;
        send.finish()?;
        Ok(User::decode(recv.read_to_end(usize::MAX).await?.as_ref())?)
    }
}
impl ProtocolHandler for UserProtocol {
    async fn accept(&self, connection: Connection) -> Result<(), AcceptError> {
        Ok(self.handle_connection(connection).await)
    }
}
