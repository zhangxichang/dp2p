mod types;

use std::sync::Arc;

use parking_lot::Mutex;
use rusqlite::hooks::Action;
use tauri::ipc::Channel;

use crate::{option_ext::OptionGet, sqlite::types::SQLiteUpdateEvent};

#[taurpc::procedures(path = "sqlite")]
pub trait SQLite {
    async fn open(path: String) -> Result<(), String>;
    async fn close() -> Result<(), String>;
    async fn on_update(channel: Channel<SQLiteUpdateEvent>);
}

#[derive(Clone, Default)]
pub struct SQLiteImpl {
    connection: Arc<Mutex<Option<rusqlite::Connection>>>,
}
#[taurpc::resolvers]
impl SQLite for SQLiteImpl {
    async fn open(self, path: String) -> Result<(), String> {
        async {
            self.connection
                .lock()
                .replace(rusqlite::Connection::open(path)?);
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn close(self) -> Result<(), String> {
        async {
            if let Some(connection) = self.connection.lock().take() {
                connection.close().map_err(|(_, err)| err)?
            }
            eyre::Ok(())
        }
        .await
        .map_err(|err| err.to_string())
    }
    async fn on_update(self, channel: Channel<SQLiteUpdateEvent>) {
        self.connection
            .lock()
            .get()
            .unwrap()
            .update_hook(Some(
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
            ))
            .unwrap();
    }
}
