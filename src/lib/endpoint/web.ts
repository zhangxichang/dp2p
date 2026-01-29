import wasm_init, {
  generate_secret_key as wasm_generate_secret_key,
  get_secret_key_id as wasm_get_secret_key_id,
  Endpoint as WasmEndpoint,
} from "@dp2p/endpoint";
import wasm_url from "@dp2p/endpoint/endpoint_wasm_bg.wasm?url";
import type { Person } from "~/lib/types";
import type { Endpoint, EndpointModule } from "./interface";
import type { ConnectionType, PersonProtocolEvent } from "./types";

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
    return new EndpointImpl(await WasmEndpoint.new(secret_key, person));
  }
  async close() {
    await this.endpoint.close();
  }
  id() {
    return this.endpoint.id();
  }
  async person_protocol_next_event() {
    return (await this.endpoint.person_protocol_next_event()) as PersonProtocolEvent;
  }
  async person_protocol_event<T>(method: string) {
    return (await this.endpoint.person_protocol_event(method)) as T;
  }
  async request_person(id: string) {
    return (await this.endpoint.request_person(id)) as Person;
  }
  async request_friend(id: string) {
    return await this.endpoint.request_friend(id);
  }
  async request_chat(id: string) {
    const a = await this.endpoint.request_chat(id);
    return a != undefined ? (a as unknown as bigint) : null;
  }
  conn_type(id: string) {
    const a = this.endpoint.conn_type(id);
    return a != undefined ? (a as ConnectionType) : null;
  }
  latency(id: string) {
    const a = this.endpoint.latency(id);
    return a != undefined ? (a as unknown as bigint) : null;
  }
  async subscribe_group(ticket: string) {
    return (await this.endpoint.subscribe_group(ticket)) as unknown as bigint;
  }
}
