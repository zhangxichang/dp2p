use std::sync::Arc;

use endpoint::Endpoint;
use sharded_slab::Slab;
use utils::option_ext::OptionGet;

use crate::router::error::MapStringError;

#[taurpc::procedures(path = "endpoint")]
pub trait EndpointApi {
    async fn generate_secret_key() -> Vec<u8>;
    async fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String, String>;
    async fn generate_group_id() -> String;
    async fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String, String>;
    async fn open_endpoint(secret_key: Vec<u8>, person: serde_json::Value)
    -> Result<usize, String>;
    async fn close_endpoint(handle: usize) -> Result<(), String>;
    async fn id(handle: usize) -> Result<String, String>;
    async fn person_protocol_next_event(handle: usize) -> Result<String, String>;
    async fn person_protocol_event(
        handle: usize,
        method: String,
    ) -> Result<serde_json::Value, String>;
    async fn request_person(handle: usize, id: String) -> Result<serde_json::Value, String>;
    async fn request_friend(handle: usize, id: String) -> Result<bool, String>;
    async fn request_chat(handle: usize, id: String) -> Result<Option<usize>, String>;
    async fn conn_type(handle: usize, id: String) -> Result<Option<String>, String>;
    async fn latency(handle: usize, id: String) -> Result<Option<usize>, String>;
    async fn subscribe_group(handle: usize, ticket: String) -> Result<usize, String>;
}

#[derive(Clone, Default)]
pub struct EndpointApiImpl {
    endpoint_pool: Arc<Slab<Endpoint>>,
}
#[taurpc::resolvers]
impl EndpointApi for EndpointApiImpl {
    async fn generate_secret_key(self) -> Vec<u8> {
        endpoint::generate_secret_key()
    }
    async fn get_secret_key_id(self, secret_key: Vec<u8>) -> Result<String, String> {
        endpoint::get_secret_key_id(secret_key).mse()
    }
    async fn generate_group_id(self) -> String {
        endpoint::generate_group_id()
    }
    async fn generate_ticket(
        self,
        group_id: String,
        bootstrap: Vec<String>,
    ) -> Result<String, String> {
        endpoint::generate_ticket(group_id, bootstrap).mse()
    }
    async fn open_endpoint(
        self,
        secret_key: Vec<u8>,
        person: serde_json::Value,
    ) -> Result<usize, String> {
        async {
            eyre::Ok(
                self.endpoint_pool
                    .insert(Endpoint::new(secret_key, serde_json::from_value(person)?).await?)
                    .get()?,
            )
        }
        .await
        .mse()
    }
    async fn close_endpoint(self, handle: usize) -> Result<(), String> {
        async {
            if let Some(endpoint) = self.endpoint_pool.take(handle) {
                endpoint.close().await?;
            }
            eyre::Ok(())
        }
        .await
        .mse()
    }
    async fn id(self, handle: usize) -> Result<String, String> {
        Ok(self.endpoint_pool.get(handle).get().mse()?.id())
    }
    async fn person_protocol_next_event(self, handle: usize) -> Result<String, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .person_protocol_next_event()
            .await
            .mse()?)
    }
    async fn person_protocol_event(
        self,
        handle: usize,
        method: String,
    ) -> Result<serde_json::Value, String> {
        Ok(self
            .endpoint_pool
            .get(handle)
            .get()
            .mse()?
            .person_protocol_event(method)
            .mse()?)
    }
    async fn request_person(self, handle: usize, id: String) -> Result<serde_json::Value, String> {
        async {
            eyre::Ok(serde_json::to_value(
                &self
                    .endpoint_pool
                    .get_owned(handle)
                    .get()?
                    .request_person(id)
                    .await?,
            )?)
        }
        .await
        .mse()
    }
    async fn request_friend(self, handle: usize, id: String) -> Result<bool, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .request_friend(id)
            .await
            .mse()?)
    }
    async fn request_chat(self, handle: usize, id: String) -> Result<Option<usize>, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .request_chat(id)
            .await
            .mse()?)
    }
    async fn conn_type(self, handle: usize, id: String) -> Result<Option<String>, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .conn_type(id)
            .mse()?)
    }
    async fn latency(self, handle: usize, id: String) -> Result<Option<usize>, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .latency(id)
            .mse()?)
    }
    async fn subscribe_group(self, handle: usize, ticket: String) -> Result<usize, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .subscribe_group(ticket)
            .await
            .mse()?)
    }
}
