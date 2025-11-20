import { Endpoint as WasmEndpoint } from "@starlink/endpoint";
import type { Person } from "./types";

type Native = { kind: "Native" } & typeof import("@tauri-apps/api/core");
type Web = { kind: "Web" } & typeof import("@starlink/endpoint");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Native", ...(await import("@tauri-apps/api/core")) };
}
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Web", ...(await import("@starlink/endpoint")) };
}

export class Endpoint {
  private wasm_inited = false;
  private endpoint?: WasmEndpoint;

  async init() {
    if (api.kind === "Native") {
    } else if (api.kind === "Web") {
      if (this.wasm_inited) return;
      await api.default({
        module_or_path: (
          await import("@starlink/endpoint/endpoint_wasm_bg.wasm?url")
        ).default,
      });
      this.wasm_inited = true;
    } else {
      throw new Error("API缺失");
    }
  }
  static async generate_secret_key() {
    if (api.kind === "Native") {
      try {
        return await api.invoke<Uint8Array>("generate_secret_key");
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      return api.generate_secret_key();
    } else {
      throw new Error("API缺失");
    }
  }
  static async get_secret_key_id(secret_key: Uint8Array) {
    if (api.kind === "Native") {
      try {
        return await api.invoke<string>("get_secret_key_id", { secret_key });
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      return api.get_secret_key_id(secret_key);
    } else {
      throw new Error("API缺失");
    }
  }
  async create(secret_key: Uint8Array, person: Person) {
    if (api.kind === "Native") {
      try {
        await api.invoke("endpoint_create", {
          secret_key,
          person,
        });
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      this.endpoint = await api.Endpoint.new(
        secret_key,
        api.Person.from_object(person),
      );
    } else {
      throw new Error("API缺失");
    }
  }
  async is_create() {
    if (api.kind === "Native") {
      try {
        return await api.invoke<boolean>("endpoint_is_create");
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      return this.endpoint ? true : false;
    } else {
      throw new Error("API缺失");
    }
  }
  async request_person(id: string) {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return (await this.endpoint.request_person(id)).to_object() as Person;
    } else {
      throw new Error("API缺失");
    }
  }
  async request_friend(id: string) {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return await this.endpoint.request_friend(id);
    } else {
      throw new Error("API缺失");
    }
  }
  async friend_request_next() {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return await this.endpoint.friend_request_next();
    } else {
      throw new Error("API缺失");
    }
  }
  async chat_request_next() {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return await this.endpoint.chat_request_next();
    } else {
      throw new Error("API缺失");
    }
  }
  async request_chat(id: string) {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return await this.endpoint.request_chat(id);
    } else {
      throw new Error("API缺失");
    }
  }
  connection_type(id: string) {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return this.endpoint.connection_type(id);
    } else {
      throw new Error("API缺失");
    }
  }
  latency(id: string) {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return this.endpoint.latency(id);
    } else {
      throw new Error("API缺失");
    }
  }
}
