use std::sync::Arc;

use eyre::{Result, bail, eyre};
use iroh::{
    Endpoint, NodeId,
    endpoint::Connection,
    protocol::{AcceptError, ProtocolHandler},
};
use rkyv::Archive;
use tokio::sync::{mpsc, oneshot};

pub const ALPN: &[u8] = b"service/v1";

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum Request {
    UserInfo,
    Friend,
    Chat,
}

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum Response {
    UserInfo(UserInfo),
    Friend(bool),
    Chat(bool),
}

#[derive(
    Archive, rkyv::Serialize, rkyv::Deserialize, Debug, Clone, serde::Serialize, serde::Deserialize,
)]
pub struct UserInfo {
    pub name: String,
    pub avatar: Option<Vec<u8>>,
    pub bio: Option<String>,
}

pub struct FriendRequest {
    response_sender: oneshot::Sender<bool>,
    remote_node_id: NodeId,
}
impl FriendRequest {
    pub fn remote_node_id(&self) -> NodeId {
        self.remote_node_id
    }
    pub fn accept(self) -> Result<()> {
        self.response_sender
            .send(true)
            .map_err(|_| eyre!("发送同意好友请求消息失败"))
    }
    pub fn reject(self) -> Result<()> {
        self.response_sender
            .send(false)
            .map_err(|_| eyre!("发送拒绝好友请求消息失败"))
    }
}

pub struct ChatRequest {
    response_sender: oneshot::Sender<bool>,
    connection: Connection,
}
impl ChatRequest {
    pub fn remote_node_id(&self) -> Result<NodeId> {
        Ok(self.connection.remote_node_id()?)
    }
    pub fn accept(self) -> Result<Connection> {
        self.response_sender
            .send(true)
            .map_err(|_| eyre!("发送同意聊天请求消息失败"))?;
        Ok(self.connection)
    }
    pub fn reject(self) -> Result<()> {
        self.response_sender
            .send(false)
            .map_err(|_| eyre!("发送拒绝聊天请求消息失败"))
    }
}

#[derive(Debug, Clone)]
pub struct Service {
    endpoint: Endpoint,
    user_info: Arc<UserInfo>,
    friend_request_sender: mpsc::UnboundedSender<FriendRequest>,
    chat_request_sender: mpsc::UnboundedSender<ChatRequest>,
}
impl Service {
    pub fn new(
        endpoint: Endpoint,
        user_info: UserInfo,
    ) -> (
        Self,
        mpsc::UnboundedReceiver<FriendRequest>,
        mpsc::UnboundedReceiver<ChatRequest>,
    ) {
        let (friend_request_sender, friend_request_receiver) = mpsc::unbounded_channel();
        let (chat_request_sender, chat_request_receiver) = mpsc::unbounded_channel();
        (
            Self {
                endpoint,
                user_info: Arc::new(user_info),
                friend_request_sender,
                chat_request_sender,
            },
            friend_request_receiver,
            chat_request_receiver,
        )
    }
    async fn handle_connection(&self, connection: Connection) -> Result<()> {
        if let Ok((mut send, mut recv)) = connection.accept_bi().await {
            if let Ok(data) = recv.read_to_end(usize::MAX).await {
                match rkyv::from_bytes::<Request, rkyv::rancor::Error>(&data)? {
                    Request::UserInfo => {
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(
                            &Response::UserInfo((*self.user_info).clone()),
                        )?)
                        .await?;
                        send.finish()?;
                        connection.closed().await;
                    }
                    Request::Friend => {
                        let (sender, receiver) = oneshot::channel::<bool>();
                        self.friend_request_sender.send(FriendRequest {
                            remote_node_id: connection.remote_node_id()?,
                            response_sender: sender,
                        })?;
                        let result = receiver.await?;
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Response::Friend(
                            result,
                        ))?)
                        .await?;
                        send.finish()?;
                        connection.closed().await;
                    }
                    Request::Chat => {
                        let (sender, receiver) = oneshot::channel::<bool>();
                        self.chat_request_sender.send(ChatRequest {
                            response_sender: sender,
                            connection,
                        })?;
                        let result = receiver.await?;
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Response::Chat(
                            result,
                        ))?)
                        .await?;
                        send.finish()?;
                    }
                }
            }
        }
        Ok(())
    }
    pub async fn request_user_info(&self, node_id: NodeId) -> Result<UserInfo> {
        let connection = self.endpoint.connect(node_id, ALPN).await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::UserInfo)?)
            .await?;
        send.finish()?;
        let Response::UserInfo(user_info) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        Ok(user_info)
    }
    pub async fn request_friend(&self, node_id: NodeId) -> Result<bool> {
        let connection = self.endpoint.connect(node_id, ALPN).await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::Friend)?)
            .await?;
        send.finish()?;
        let Response::Friend(result) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        Ok(result)
    }
    pub async fn request_chat(&self, node_id: NodeId) -> Result<Option<Connection>> {
        let connection = self.endpoint.connect(node_id, ALPN).await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::Chat)?)
            .await?;
        send.finish()?;
        let Response::Chat(result) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        if !result {
            return Ok(None);
        }
        Ok(Some(connection))
    }
}
impl ProtocolHandler for Service {
    async fn accept(&self, connection: Connection) -> Result<(), AcceptError> {
        self.handle_connection(connection)
            .await
            .map_err(|err| AcceptError::User { source: err.into() })
    }
}
