use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

use eyre::{Result, bail, eyre};
use iroh::{
    Endpoint, NodeId,
    endpoint::{Connection, RecvStream, SendStream},
    protocol::{AcceptError, ProtocolHandler},
};
use parking_lot::{Mutex, RwLock};
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
    Chat(Result<(), RequestChatError>),
}

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum RequestChatError {
    NotFriend,
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
    node_id: NodeId,
    sender: oneshot::Sender<bool>,
}
impl FriendRequest {
    pub fn node_id(&self) -> NodeId {
        self.node_id
    }
    pub fn accept(self) -> Result<()> {
        self.sender
            .send(true)
            .map_err(|_| eyre!("发送同意好友请求消息失败"))
    }
    pub fn reject(self) -> Result<()> {
        self.sender
            .send(false)
            .map_err(|_| eyre!("发送拒绝好友请求消息失败"))
    }
}

#[derive(Debug, Clone)]
pub struct Service {
    endpoint: Endpoint,
    user_info: Arc<RwLock<UserInfo>>,
    friend_request_sender: mpsc::UnboundedSender<FriendRequest>,
    friends: Arc<RwLock<HashSet<NodeId>>>,
    chats: Arc<RwLock<HashMap<NodeId, Arc<Mutex<RecvStream>>>>>,
}
impl Service {
    pub fn new(
        endpoint: Endpoint,
        user_info: UserInfo,
    ) -> (Self, mpsc::UnboundedReceiver<FriendRequest>) {
        let (friend_request_sender, friend_request_receiver) = mpsc::unbounded_channel();
        (
            Self {
                endpoint,
                user_info: Arc::new(RwLock::new(user_info)),
                friend_request_sender,
                friends: Default::default(),
                chats: Default::default(),
            },
            friend_request_receiver,
        )
    }
    async fn handle_connection(&self, connection: Connection) -> Result<()> {
        if let Ok((mut send, mut recv)) = connection.accept_bi().await {
            if let Ok(data) = recv.read_to_end(usize::MAX).await {
                match rkyv::from_bytes::<Request, rkyv::rancor::Error>(&data)? {
                    Request::UserInfo => {
                        let user_info = self.user_info.read().clone();
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(
                            &Response::UserInfo(user_info),
                        )?)
                        .await?;
                        send.finish()?;
                    }
                    Request::Friend => {
                        let node_id = connection.remote_node_id()?;
                        let (sender, receiver) = oneshot::channel::<bool>();
                        self.friend_request_sender
                            .send(FriendRequest { node_id, sender })?;
                        let result = receiver.await?;
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Response::Friend(
                            result,
                        ))?)
                        .await?;
                        send.finish()?;
                    }
                    Request::Chat => {
                        if self.friends.read().contains(&connection.remote_node_id()?) {
                            send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(
                                &Response::Chat(Ok(())),
                            )?)
                            .await?;
                            send.finish()?;
                            self.chats
                                .write()
                                .insert(connection.remote_node_id()?, Arc::new(Mutex::new(recv)));
                        } else {
                            send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(
                                &Response::Chat(Err(RequestChatError::NotFriend)),
                            )?)
                            .await?;
                            send.finish()?;
                        }
                    }
                }
            }
        }
        connection.closed().await;
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
    pub fn set_friends(&self, friends: Vec<NodeId>) {
        *self.friends.write() = friends.into_iter().collect();
    }
    pub async fn request_chat(&self, node_id: NodeId) -> Result<(SendStream, RecvStream)> {
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
        if let Err(request_chat_error) = result {
            match request_chat_error {
                RequestChatError::NotFriend => bail!("你不是对方的好友"),
            }
        }
        Ok((send, recv))
    }
    pub fn get_chat_recv(&self, node_id: NodeId) -> Option<Arc<Mutex<RecvStream>>> {
        self.chats.read().get(&node_id).cloned()
    }
}
impl ProtocolHandler for Service {
    async fn accept(&self, connection: Connection) -> Result<(), AcceptError> {
        self.handle_connection(connection)
            .await
            .map_err(|err| AcceptError::User { source: err.into() })
    }
}
