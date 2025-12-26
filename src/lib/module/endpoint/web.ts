import type { EndpointAdapter } from "./interface";
import wasm_init, {
  generate_secret_key as wasm_generate_secret_key,
  get_secret_key_id as wasm_get_secret_key_id,
  Endpoint as WasmEndpoint,
  Person as WasmPerson,
} from "@starlink/endpoint";
import wasm_url from "@starlink/endpoint/endpoint_wasm_bg.wasm?url";
import type { Person } from "~/lib/types";

export class Endpoint implements EndpointAdapter {
  private endpoint?: WasmEndpoint;

  async init() {
    await wasm_init({ module_or_path: wasm_url });
  }
  free() {}
  async open(secret_key: Uint8Array, person: Person) {
    this.endpoint = await WasmEndpoint.new(
      secret_key,
      WasmPerson.from_object(person),
    );
  }
  private get_endpoint() {
    if (!this.endpoint) throw new Error("Endpoint没有初始化");
    return this.endpoint;
  }
  async shutdown() {
    await this.get_endpoint().shutdown();
  }
}

export function generate_secret_key() {
  return wasm_generate_secret_key();
}
export function get_secret_key_id(secret_key: Uint8Array) {
  return wasm_get_secret_key_id(secret_key);
}
