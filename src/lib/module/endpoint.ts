import type { EndpointAdapter } from "./endpoint/interface";

type Native = { kind: "Native" };
type Web = { kind: "Web" } & typeof import("./endpoint/web");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = { kind: "Native" };
} else {
  api = { kind: "Web", ...(await import("./endpoint/web")) };
}

export function create_endpoint(): EndpointAdapter {
  if (api.kind === "Native") {
    throw new Error("未实现");
  } else if (api.kind === "Web") {
    return new api.Endpoint();
  } else {
    throw new Error("API缺失");
  }
}

export function generate_secret_key() {
  if (api.kind === "Native") {
    throw new Error("未实现");
  } else if (api.kind === "Web") {
    return api.generate_secret_key();
  } else {
    throw new Error("API缺失");
  }
}
export function get_secret_key_id(secret_key: Uint8Array) {
  if (api.kind === "Native") {
    throw new Error("未实现");
  } else if (api.kind === "Web") {
    return api.get_secret_key_id(secret_key);
  } else {
    throw new Error("API缺失");
  }
}
