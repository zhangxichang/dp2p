use parking_lot::Mutex;
use rusqlite::{ToSql, hooks::Action, params_from_iter, types::FromSql};
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

use crate::{
    error::{Error, OptionGet},
    state::State,
};

enum SQLiteType {
    Null,
    Integer(i64),
    Real(f64),
    Text(String),
    Blob(Vec<u8>),
}
impl TryFrom<serde_json::Value> for SQLiteType {
    type Error = Error;

    fn try_from(value: serde_json::Value) -> Result<Self, Self::Error> {
        Ok(match value {
            serde_json::Value::Null => Self::Null,
            serde_json::Value::Bool(value) => Self::Integer(value as _),
            serde_json::Value::Number(value) => {
                if let Some(value) = value.as_i64() {
                    Self::Integer(value)
                } else if let Some(value) = value.as_f64() {
                    Self::Real(value)
                } else {
                    return Err(Error::User {
                        error: "无法转换的数值类型".to_string(),
                    });
                }
            }
            serde_json::Value::String(value) => Self::Text(value),
            serde_json::Value::Array(array) => Self::Blob(
                array
                    .into_iter()
                    .map(|v| Ok(v.as_u64().get_move()? as _))
                    .collect::<Result<Vec<u8>, Error>>()?,
            ),
            serde_json::Value::Object(_) => {
                return Err(Error::User {
                    error: "目标不能为对象".to_string(),
                });
            }
        })
    }
}
impl TryFrom<SQLiteType> for serde_json::Value {
    type Error = Error;

    fn try_from(value: SQLiteType) -> Result<Self, Self::Error> {
        Ok(match value {
            SQLiteType::Null => Self::Null,
            SQLiteType::Integer(value) => Self::Number(value.into()),
            SQLiteType::Real(value) => {
                if let Some(value) = serde_json::Number::from_f64(value) {
                    Self::Number(value)
                } else {
                    return Err(Error::User {
                        error: "无法转换的数值类型".to_string(),
                    });
                }
            }
            SQLiteType::Text(value) => Self::String(value),
            SQLiteType::Blob(value) => Self::Array(
                value
                    .into_iter()
                    .map(|value| serde_json::Value::Number(value.into()))
                    .collect(),
            ),
        })
    }
}
impl ToSql for SQLiteType {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        match self {
            SQLiteType::Null => Ok(rusqlite::types::ToSqlOutput::Owned(
                rusqlite::types::Value::Null,
            )),
            SQLiteType::Integer(value) => Ok(rusqlite::types::ToSqlOutput::Owned((*value).into())),
            SQLiteType::Real(value) => Ok(rusqlite::types::ToSqlOutput::Owned((*value).into())),
            SQLiteType::Text(value) => {
                Ok(rusqlite::types::ToSqlOutput::Owned(value.clone().into()))
            }
            SQLiteType::Blob(value) => {
                Ok(rusqlite::types::ToSqlOutput::Owned(value.clone().into()))
            }
        }
    }
}
impl FromSql for SQLiteType {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        match value {
            rusqlite::types::ValueRef::Null => Ok(SQLiteType::Null),
            rusqlite::types::ValueRef::Integer(value) => Ok(SQLiteType::Integer(value)),
            rusqlite::types::ValueRef::Real(value) => Ok(SQLiteType::Real(value)),
            rusqlite::types::ValueRef::Text(value) => Ok(SQLiteType::Text(
                String::from_utf8(value.to_vec())
                    .map_err(|_| rusqlite::types::FromSqlError::InvalidType)?,
            )),
            rusqlite::types::ValueRef::Blob(value) => Ok(SQLiteType::Blob(value.to_vec())),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SQLiteUpdateEvent {
    update_type: i32,
    db_name: String,
    table_name: String,
    row_id: i64,
}

#[derive(Default)]
pub struct Sqlite {
    connection: Mutex<Option<rusqlite::Connection>>,
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_open(state: tauri::State<'_, State>, path: String) -> Result<(), Error> {
    state
        .db
        .connection
        .lock()
        .replace(rusqlite::Connection::open(path)?);
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_is_open(state: tauri::State<'_, State>) -> Result<bool, Error> {
    Ok(state.db.connection.lock().is_some())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_close(state: tauri::State<'_, State>) -> Result<(), Error> {
    if let Some(db) = state.db.connection.lock().take() {
        db.close().map_err(|v| v.1)?;
    }
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_on_update(
    state: tauri::State<'_, State>,
    channel: Channel<SQLiteUpdateEvent>,
) -> Result<(), Error> {
    state.db.connection.lock().get()?.update_hook(Some(
        move |update_type: Action, db_name: &str, table_name: &str, row_id| {
            if let Err(err) = channel.send(SQLiteUpdateEvent {
                update_type: match update_type {
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
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_execute_batch(
    state: tauri::State<'_, State>,
    sql: String,
) -> Result<(), Error> {
    state.db.connection.lock().get()?.execute_batch(&sql)?;
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_execute(
    state: tauri::State<'_, State>,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<(), Error> {
    state.db.connection.lock().get()?.execute(
        &sql,
        params_from_iter(
            params
                .into_iter()
                .map(|value| value.try_into())
                .collect::<Result<Vec<SQLiteType>, Error>>()?,
        ),
    )?;
    Ok(())
}
#[tauri::command(rename_all = "snake_case")]
pub async fn sqlite_query(
    state: tauri::State<'_, State>,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, Error> {
    let db = state.db.connection.lock();
    let db = db.get()?;
    let mut statement = db.prepare(&sql)?;
    Ok(statement
        .query_map(
            params_from_iter(
                params
                    .into_iter()
                    .map(|value| value.try_into())
                    .collect::<Result<Vec<SQLiteType>, Error>>()?,
            ),
            |row| {
                let mut object = serde_json::Map::new();
                for key in row.as_ref().column_names() {
                    let index = row.as_ref().column_index(key)?;
                    let data_type = row.get_ref(index)?.data_type();
                    object.insert(
                        key.to_string(),
                        row.get::<_, SQLiteType>(index)?
                            .try_into()
                            .map_err(|err: Error| {
                                rusqlite::Error::FromSqlConversionFailure(
                                    index,
                                    data_type,
                                    err.into(),
                                )
                            })?,
                    );
                }
                Ok(serde_json::Value::Object(object))
            },
        )?
        .collect::<Result<_, _>>()?)
}
