import type { Endpoint as WasmEndpoint } from "@starlink/endpoint";
import type { UserInfo } from "./types";

let tauri_core: typeof import("@tauri-apps/api/core") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  tauri_core = await import("@tauri-apps/api/core");
}
let endpoint: typeof import("@starlink/endpoint") | undefined;
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  const pkg = await import("@starlink/endpoint");
  await pkg.default({
    module_or_path: (
      await import("@starlink/endpoint/endpoint_wasm_bg.wasm?url")
    ).default,
  });
  endpoint = pkg;
}

export class Endpoint {
  web_inner?: WasmEndpoint;

  async init(secret_key: Uint8Array, user_info: UserInfo) {
    if (tauri_core) {
      return;
    } else if (endpoint) {
      this.web_inner = await endpoint.Endpoint.new(
        secret_key,
        endpoint.UserInfo.from_object(user_info),
      );
      return;
    }
    throw new Error("API缺失");
  }
  async request_user_info(id: string) {
    if (tauri_core) {
      return {} as UserInfo;
    } else if (endpoint) {
      if (!this.web_inner) throw new Error("未初始化");
      return (
        await this.web_inner.request_user_info(id)
      ).to_object() as UserInfo;
    }
    throw new Error("API缺失");
  }
}

export function generate_secret_key() {
  if (tauri_core) {
    return new Uint8Array();
  } else if (endpoint) {
    return endpoint.generate_secret_key();
  }
  throw new Error("API缺失");
}

export function get_secret_key_id(secret_key: Uint8Array) {
  if (tauri_core) {
    return "";
  } else if (endpoint) {
    return endpoint.get_secret_key_id(secret_key);
  }
  throw new Error("API缺失");
}
