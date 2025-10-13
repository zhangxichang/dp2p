use eyre::Result;
use iroh::{Endpoint, NodeId, SecretKey, protocol::Router};
use tokio::sync::{mpsc, oneshot};

use crate::service::{self, Service, UserInfo};

pub struct Node {
    router: Router,
    service: Service,
}
impl Node {
    pub async fn new(
        secret_key: SecretKey,
        user_info: UserInfo,
        friend_request_sender: mpsc::UnboundedSender<(NodeId, oneshot::Sender<bool>)>,
    ) -> Result<Self> {
        let endpoint = Endpoint::builder()
            .secret_key(secret_key)
            .discovery_n0()
            .bind()
            .await?;
        let service = Service::new(endpoint.clone(), user_info, friend_request_sender);
        Ok(Self {
            router: Router::builder(endpoint)
                .accept(service::ALPN, service.clone())
                .spawn(),
            service,
        })
    }
    pub fn id(&self) -> NodeId {
        self.router.endpoint().node_id()
    }
    pub async fn shutdown(&self) -> Result<()> {
        Ok(self.router.shutdown().await?)
    }
    pub async fn request_user_info(&self, node_id: NodeId) -> Result<UserInfo> {
        self.service.request_user_info(node_id).await
    }
    pub async fn request_friend(&self, node_id: NodeId) -> Result<bool> {
        self.service.request_friend(node_id).await
    }
}
