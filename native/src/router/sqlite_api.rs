mod traits;
mod types;
mod utils;

use std::sync::Arc;

use eyre::eyre;
use sharded_slab::Slab;
use tauri::ipc::Channel;
use tokio_rusqlite::{hooks::Action, params_from_iter};

use crate::{
    option_ext::OptionGet,
    router::sqlite_api::{traits::IntoJSONValue, types::SQLiteUpdateEvent, utils::json_sql_params},
};

#[taurpc::procedures(path = "sqlite")]
pub trait SQLiteApi {
    async fn open_db(path: String) -> Result<usize, String>;
    async fn close_db(id: usize) -> Result<(), String>;
    async fn execute_sql(id: usize, sql: String) -> Result<(), String>;
    async fn execute(id: usize, sql: String, params: Vec<serde_json::Value>) -> Result<(), String>;
    async fn query(
        id: usize,
        sql: String,
        params: Vec<serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, String>;
    async fn on_update(id: usize, channel: Channel<SQLiteUpdateEvent>) -> Result<(), String>;
}

#[derive(Clone, Default)]
pub struct SQLiteApiImpl {
    connection_pool: Arc<Slab<tokio_rusqlite::Connection>>,
}
#[taurpc::resolvers]
impl SQLiteApi for SQLiteApiImpl {
    async fn open_db(self, path: String) -> Result<usize, String> {
        async {
            eyre::Ok(
                self.connection_pool
                    .insert(tokio_rusqlite::Connection::open(path).await?)
                    .get_move()?,
            )
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn close_db(self, id: usize) -> Result<(), String> {
        async {
            if let Some(connection) = self.connection_pool.take(id) {
                connection.close().await?;
            }
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn execute_sql(self, id: usize, sql: String) -> Result<(), String> {
        async {
            self.connection_pool
                .get_owned(id)
                .get_move()?
                .call(move |connection| {
                    connection.execute_batch(&sql)?;
                    eyre::Ok(())
                })
                .await
                .map_err(|err| eyre!(err))?;
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn execute(
        self,
        id: usize,
        sql: String,
        params: Vec<serde_json::Value>,
    ) -> Result<(), String> {
        async {
            self.connection_pool
                .get_owned(id)
                .get_move()?
                .call(move |connection| {
                    connection.execute(&sql, params_from_iter(json_sql_params(params)?))?;
                    eyre::Ok(())
                })
                .await
                .map_err(|err| eyre!(err))?;
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn query(
        self,
        id: usize,
        sql: String,
        params: Vec<serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, String> {
        async {
            eyre::Ok(
                self.connection_pool
                    .get_owned(id)
                    .get_move()?
                    .call(move |connection| {
                        let mut statement = connection.prepare(&sql)?;
                        let column_names = statement
                            .column_names()
                            .into_iter()
                            .map(|v| v.to_string())
                            .collect::<Vec<String>>();
                        let result = statement
                            .query_map(params_from_iter(json_sql_params(params)?), |row| {
                                let mut object = serde_json::Map::new();
                                for (i, key) in column_names.iter().enumerate() {
                                    object.insert(
                                        key.clone(),
                                        row.get::<_, tokio_rusqlite::types::Value>(i)?
                                            .into_json_value(),
                                    );
                                }
                                Ok(serde_json::Value::Object(object))
                            })?
                            .collect::<Result<Vec<_>, _>>()?;
                        eyre::Ok(result)
                    })
                    .await
                    .map_err(|err| eyre!(err))?,
            )
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn on_update(self, id: usize, channel: Channel<SQLiteUpdateEvent>) -> Result<(), String> {
        async {
            self.connection_pool
                .get_owned(id)
                .get_move()?
                .call(move |connection| {
                    connection.update_hook(Some(
                        move |action: Action, db_name: &str, table_name: &str, row_id| {
                            if let Err(err) = channel.send(SQLiteUpdateEvent {
                                update_type: match action {
                                    Action::SQLITE_DELETE => 9,
                                    Action::SQLITE_INSERT => 18,
                                    Action::SQLITE_UPDATE => 23,
                                    _ => -1,
                                },
                                db_name: db_name.to_string(),
                                table_name: table_name.to_string(),
                                row_id,
                            }) {
                                log::error!("{}", err);
                            }
                        },
                    ));
                    eyre::Ok(())
                })
                .await
                .map_err(|err| eyre!(err))?;
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
}
