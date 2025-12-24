use specta_typescript::BigIntExportBehavior;
use taurpc::{Router, Typescript};

use crate::{
    api::{Api, ApiImpl},
    sqlite::{SQLite, SQLiteImpl},
};

pub fn router<R: tauri::Runtime>() -> Router<R> {
    Router::<R>::new()
        .export_config(Typescript::new().bigint(BigIntExportBehavior::BigInt))
        .merge(ApiImpl::default().into_handler())
        .merge(SQLiteImpl::default().into_handler())
}
