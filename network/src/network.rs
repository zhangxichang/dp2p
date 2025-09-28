pub mod user_protocol;

use std::sync::Arc;

use eyre::Result;
use iroh::{Endpoint, protocol::Router};
use iroh_gossip::net::Gossip;
use protocol::User;

use crate::network::user_protocol::{Account, UserProtocol};

pub struct Network {
    router: Router,
    user_protocol: UserProtocol,
    gossip: Gossip,
}
impl Network {
    pub async fn new(account: Account) -> Result<Self> {
        let endpoint = Endpoint::builder()
            .secret_key(account.key.clone())
            .discovery_n0()
            .bind()
            .await?;
        let user_protocol = UserProtocol::new(endpoint.clone(), account);
        let gossip = Gossip::builder().spawn(endpoint.clone());
        Ok(Self {
            router: Router::builder(endpoint)
                .accept(user_protocol::ALPN, user_protocol.clone())
                .accept(iroh_gossip::ALPN, gossip.clone())
                .spawn(),
            user_protocol,
            gossip,
        })
    }
    pub async fn shutdown(&self) -> Result<()> {
        Ok(self.router.shutdown().await?)
    }
    pub fn account(&self) -> Arc<Account> {
        self.user_protocol.account.clone()
    }
    pub async fn search_user(&self, user_id: impl AsRef<str>) -> Result<User> {
        self.user_protocol.request_user_info(user_id).await
    }
}
