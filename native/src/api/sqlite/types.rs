use rusqlite::{ToSql, types::FromSql};
use serde::Serialize;

use crate::{error::Error, option_ext::OptionGet};

pub enum SQLiteType {
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

#[derive(Serialize, Clone)]
pub struct SQLiteUpdateEvent {
    pub update_type: i32,
    pub db_name: String,
    pub table_name: String,
    pub row_id: i64,
}
