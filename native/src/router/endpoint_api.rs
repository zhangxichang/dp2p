use std::sync::Arc;

use endpoint::Endpoint;
use sharded_slab::Slab;
use utils::option_ext::OptionGet;

#[taurpc::procedures(path = "endpoint")]
pub trait EndpointApi {
    async fn open_endpoint(secret_key: Vec<u8>, person: serde_json::Value)
    -> Result<usize, String>;
    async fn close_endpoint(id: usize) -> Result<(), String>;
}

#[derive(Clone, Default)]
pub struct EndpointApiImpl {
    endpoint_pool: Arc<Slab<Endpoint>>,
}
#[taurpc::resolvers]
impl EndpointApi for EndpointApiImpl {
    async fn open_endpoint(
        self,
        secret_key: Vec<u8>,
        person: serde_json::Value,
    ) -> Result<usize, String> {
        async {
            eyre::Ok(
                self.endpoint_pool
                    .insert(Endpoint::new(secret_key, serde_json::from_value(person)?).await?)
                    .get_move()?,
            )
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn close_endpoint(self, id: usize) -> Result<(), String> {
        async {
            if let Some(endpoint) = self.endpoint_pool.take(id) {
                endpoint.close().await?;
            }
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
}
