use eyre::Result;
use iroh::{Endpoint, NodeId, SecretKey, endpoint::Connection, protocol::Router};
use tokio::sync::mpsc;

use crate::service::{self, ChatRequest, FriendRequest, Service, UserInfo};

pub struct Node {
    router: Router,
    service: Service,
}
impl Node {
    pub async fn new(
        secret_key: SecretKey,
        user_info: UserInfo,
    ) -> Result<(
        Self,
        mpsc::UnboundedReceiver<FriendRequest>,
        mpsc::UnboundedReceiver<ChatRequest>,
    )> {
        let endpoint = Endpoint::builder()
            .secret_key(secret_key)
            .discovery_n0()
            .bind()
            .await?;
        let (service, friend_request_receiver, chat_request_receiver) =
            Service::new(endpoint.clone(), user_info);
        Ok((
            Self {
                router: Router::builder(endpoint)
                    .accept(service::ALPN, service.clone())
                    .spawn(),
                service,
            },
            friend_request_receiver,
            chat_request_receiver,
        ))
    }
    pub fn id(&self) -> NodeId {
        self.router.endpoint().node_id()
    }
    pub async fn request_user_info(&self, node_id: NodeId) -> Result<UserInfo> {
        self.service.request_user_info(node_id).await
    }
    pub async fn request_friend(&self, node_id: NodeId) -> Result<bool> {
        self.service.request_friend(node_id).await
    }
    pub async fn request_chat(&self, node_id: NodeId) -> Result<Option<Connection>> {
        self.service.request_chat(node_id).await
    }
}
