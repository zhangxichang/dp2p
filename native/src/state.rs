use crate::{endpoint::Endpoint, sqlite::Sqlite};

#[derive(Default)]
pub struct State {
    pub db: Sqlite,
    pub endpoint: Endpoint,
}
