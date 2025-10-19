use std::sync::Arc;

use eyre::Result;
use iroh::{
    Endpoint, NodeId, SecretKey,
    endpoint::{RecvStream, SendStream},
    protocol::Router,
};
use parking_lot::Mutex;
use tokio::sync::mpsc;

use crate::service::{self, FriendRequest, Service, UserInfo};

pub struct Node {
    router: Router,
    service: Service,
}
impl Node {
    pub async fn new(
        secret_key: SecretKey,
        user_info: UserInfo,
    ) -> Result<(Self, mpsc::UnboundedReceiver<FriendRequest>)> {
        let endpoint = Endpoint::builder()
            .secret_key(secret_key)
            .discovery_n0()
            .bind()
            .await?;
        let (service, friend_request_receiver) = Service::new(endpoint.clone(), user_info);
        Ok((
            Self {
                router: Router::builder(endpoint)
                    .accept(service::ALPN, service.clone())
                    .spawn(),
                service,
            },
            friend_request_receiver,
        ))
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
    pub fn set_friends(&self, friends: Vec<NodeId>) {
        self.service.set_friends(friends);
    }
    pub async fn request_chat(&self, node_id: NodeId) -> Result<(SendStream, RecvStream)> {
        self.service.request_chat(node_id).await
    }
    pub fn get_chat_recv(&self, node_id: NodeId) -> Option<Arc<Mutex<RecvStream>>> {
        self.service.get_chat_recv(node_id)
    }
}
