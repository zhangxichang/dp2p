use std::sync::Arc;

use eyre::{Result, bail};
use iroh::{
    Endpoint, NodeId,
    endpoint::Connection,
    protocol::{AcceptError, ProtocolHandler},
};
use n0_future::task::spawn;
use rkyv::Archive;
use tokio::sync::{mpsc, oneshot};

pub const ALPN: &[u8] = b"service/v1";

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum Request {
    UserInfo,
    AddFriend,
}

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum Response {
    UserInfo(UserInfo),
    AddFriend(bool),
}

#[derive(
    Archive, rkyv::Serialize, rkyv::Deserialize, Debug, Clone, serde::Serialize, serde::Deserialize,
)]
pub struct UserInfo {
    pub name: String,
    pub avatar: Option<Vec<u8>>,
    pub bio: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Service {
    endpoint: Endpoint,
    user_info: Arc<UserInfo>,
    friend_request_sender: mpsc::UnboundedSender<(NodeId, oneshot::Sender<bool>)>,
}
impl Service {
    pub fn new(
        endpoint: Endpoint,
        user_info: UserInfo,
        friend_request_sender: mpsc::UnboundedSender<(NodeId, oneshot::Sender<bool>)>,
    ) -> Self {
        Self {
            endpoint,
            user_info: Arc::new(user_info),
            friend_request_sender,
        }
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
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::AddFriend)?)
            .await?;
        send.finish()?;
        let Response::AddFriend(result) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        Ok(result)
    }
}
impl ProtocolHandler for Service {
    async fn accept(&self, connection: Connection) -> Result<(), AcceptError> {
        while let Ok((mut send, mut recv)) = connection.accept_bi().await {
            spawn({
                let node_id = connection.remote_node_id()?;
                let user_info = self.user_info.clone();
                let friend_request_sender = self.friend_request_sender.clone();
                async move {
                    if let Err(err) = async {
                        while let Ok(data) = recv.read_to_end(usize::MAX).await {
                            match rkyv::from_bytes::<Request, rkyv::rancor::Error>(&data)? {
                                Request::UserInfo => {
                                    send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(
                                        &Response::UserInfo((*user_info).clone()),
                                    )?)
                                    .await?;
                                    send.finish()?;
                                    break;
                                }
                                Request::AddFriend => {
                                    let (sender, receiver) = oneshot::channel::<bool>();
                                    friend_request_sender.send((node_id, sender))?;
                                    let result = receiver.await?;
                                    send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(
                                        &Response::AddFriend(result),
                                    )?)
                                    .await?;
                                    send.finish()?;
                                    break;
                                }
                            }
                        }
                        eyre::Ok(())
                    }
                    .await
                    {
                        log::error!("连接处理错误:{}", err);
                    }
                }
            });
        }
        Ok(())
    }
}
