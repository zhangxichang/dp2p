#[taurpc::procedures(export_to = "../src/generated/ipc_bindings.ts")]
pub trait Api {}

#[derive(Clone, Default)]
pub struct ApiImpl {}
#[taurpc::resolvers]
impl Api for ApiImpl {}
