mod api;
mod endpoint_api;
mod sqlite_api;

use specta_typescript::BigIntExportBehavior;
use taurpc::{Router, Typescript};

use crate::router::{
    api::{Api, ApiImpl},
    endpoint_api::{EndpointApi, EndpointApiImpl},
    sqlite_api::{SQLiteApi, SQLiteApiImpl},
};

pub fn router<R: tauri::Runtime>() -> Router<R> {
    Router::<R>::new()
        .export_config(Typescript::new().bigint(BigIntExportBehavior::BigInt))
        .merge(ApiImpl::default().into_handler())
        .merge(SQLiteApiImpl::default().into_handler())
        .merge(EndpointApiImpl::default().into_handler())
}
