import wasm_init, {
  generate_secret_key as wasm_generate_secret_key,
  get_secret_key_id as wasm_get_secret_key_id,
  Endpoint as WasmEndpoint,
  Person as WasmPerson,
} from "@starlink/endpoint";
import wasm_url from "@starlink/endpoint/endpoint_wasm_bg.wasm?url";
import type { Person } from "~/lib/types";
import type { Endpoint, EndpointModule } from "./interface";

export class EndpointModuleImpl implements EndpointModule {
  async init() {
    await wasm_init({ module_or_path: wasm_url });
  }
  async create_endpoint(secret_key: Uint8Array, person: Person) {
    return await EndpointImpl.new(secret_key, person);
  }
  generate_secret_key() {
    return wasm_generate_secret_key();
  }
  get_secret_key_id(secret_key: Uint8Array) {
    return wasm_get_secret_key_id(secret_key);
  }
}

export class EndpointImpl implements Endpoint {
  private endpoint: WasmEndpoint;

  private constructor(endpoint: WasmEndpoint) {
    this.endpoint = endpoint;
  }
  static async new(secret_key: Uint8Array, person: Person) {
    return new EndpointImpl(
      await WasmEndpoint.new(secret_key, WasmPerson.from_object(person)),
    );
  }
  async close() {
    await this.endpoint.close();
  }
}
