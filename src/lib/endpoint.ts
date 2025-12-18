import type {
  Endpoint as WasmEndpoint,
  FriendRequest as WasmFriendRequest,
  ChatRequest as WasmChatRequest,
  Connection as WasmConnection,
  Group as WasmGroup,
} from "@starlink/endpoint";
import type { Person } from "~/lib/types";

type Native = { kind: "Native" } & typeof import("~/lib/invoke/endpoint");
type Web = { kind: "Web" } & typeof import("@starlink/endpoint");

let api: Native | Web;
let wasm_url: string | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = { kind: "Native", ...(await import("~/lib/invoke/endpoint")) };
} else {
  api = { kind: "Web", ...(await import("@starlink/endpoint")) };
  wasm_url = (await import("@starlink/endpoint/endpoint_wasm_bg.wasm?url"))
    .default;
}

export type Event =
  | {
      kind: "FriendRequest";
      value: FriendRequest;
    }
  | {
      kind: "ChatRequest";
      value: ChatRequest;
    };
export type EventKind = "FriendRequest" | "ChatRequest";
export type ConnectionType = "Direct" | "Relay" | "Mixed" | "None";

export class Endpoint {
  private wasm_inited = false;
  private endpoint?: WasmEndpoint;

  async init() {
    if (api.kind === "Native") {
      return;
    } else if (api.kind === "Web") {
      if (this.wasm_inited) return;
      await api.default({
        module_or_path: wasm_url,
      });
      this.wasm_inited = true;
    } else {
      throw new Error("API缺失");
    }
  }
  async open(secret_key: Uint8Array, person: Person) {
    if (api.kind === "Native") {
      await api.open(secret_key, person);
    } else if (api.kind === "Web") {
      this.endpoint = await api.Endpoint.new(
        secret_key,
        api.Person.from_object(person),
      );
    } else {
      throw new Error("API缺失");
    }
  }
  async is_open() {
    if (api.kind === "Native") {
      return await api.is_open();
    } else if (api.kind === "Web") {
      return this.endpoint ? true : false;
    } else {
      throw new Error("API缺失");
    }
  }
  async close() {
    if (api.kind === "Native") {
      await api.close();
    } else if (api.kind === "Web") {
      if (this.endpoint) {
        this.endpoint.free();
        this.endpoint = undefined;
      }
    } else {
      throw new Error("API缺失");
    }
  }
  async request_person(id: string) {
    if (api.kind === "Native") {
      return await api.request_person(id);
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return (await this.endpoint.request_person(id)).to_object() as Person;
    } else {
      throw new Error("API缺失");
    }
  }
  async request_friend(id: string) {
    if (api.kind === "Native") {
      return await api.request_friend(id);
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return await this.endpoint.request_friend(id);
    } else {
      throw new Error("API缺失");
    }
  }
  async request_chat(id: string) {
    if (api.kind === "Native") {
      const cid = await api.request_chat(id);
      if (cid !== undefined) {
        return new Connection({
          id: cid,
        });
      }
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      const wasm_connection = await this.endpoint.request_chat(id);
      if (wasm_connection) {
        return new Connection({
          wasm_connection,
        });
      }
    } else {
      throw new Error("API缺失");
    }
  }
  async person_protocol_event_next() {
    if (api.kind === "Native") {
      const kind = await api.person_protocol_event_next();
      if (kind === "FriendRequest") {
        return {
          kind,
          value: new FriendRequest(),
        } satisfies Event as Event;
      } else if (kind === "ChatRequest") {
        return {
          kind,
          value: new ChatRequest(),
        } satisfies Event as Event;
      }
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      const event = await this.endpoint.person_protocol_event_next();
      if (!event) return;
      const kind = event.kind();
      if (kind === "FriendRequest") {
        return {
          kind,
          value: new FriendRequest(event.as_friend_request()),
        } satisfies Event as Event;
      } else if (kind === "ChatRequest") {
        return {
          kind,
          value: new ChatRequest(event.as_chat_request()),
        } satisfies Event as Event;
      }
    } else {
      throw new Error("API缺失");
    }
  }
  async conn_type(id: string) {
    if (api.kind === "Native") {
      return (await api.conn_type(id)) as ConnectionType | undefined;
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return this.endpoint.conn_type(id) as ConnectionType | undefined;
    } else {
      throw new Error("API缺失");
    }
  }
  async latency(id: string) {
    if (api.kind === "Native") {
      return await api.latency(id);
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return this.endpoint.latency(id);
    } else {
      throw new Error("API缺失");
    }
  }
  async subscribe_group(ticket: string) {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.endpoint) throw new Error("未初始化");
      return new Group({
        wasm_group: await this.endpoint.subscribe_group(ticket),
      });
    } else {
      throw new Error("API缺失");
    }
  }
}

type GroupEvent =
  | "Lagged"
  | {
      NeighborUp: string;
    }
  | {
      NeighborDown: string;
    }
  | {
      Received: {
        content: Uint8Array;
        delivered_from: string;
        scope: "Neighbors" | { Swarm: number };
      };
    };

export class Group {
  private wasm_group?: WasmGroup;

  constructor(options: { wasm_group?: WasmGroup }) {
    this.wasm_group = options.wasm_group;
  }
  async next_event() {
    if (api.kind === "Native") {
      throw new Error("未实现");
    } else if (api.kind === "Web") {
      if (!this.wasm_group) throw new Error("未初始化");
      return (await this.wasm_group.next_event()) as GroupEvent | undefined;
    } else {
      throw new Error("API缺失");
    }
  }
}

export function generate_group_id() {
  if (api.kind === "Native") {
    throw new Error("未实现");
  } else if (api.kind === "Web") {
    return api.generate_group_id();
  } else {
    throw new Error("API缺失");
  }
}
export function generate_ticket(group_id: string, bootstrap: string[]) {
  if (api.kind === "Native") {
    throw new Error("未实现");
  } else if (api.kind === "Web") {
    return api.generate_ticket(group_id, bootstrap);
  } else {
    throw new Error("API缺失");
  }
}

export class FriendRequest {
  private wasm_friend_request?: WasmFriendRequest;

  constructor(wasm_friend_request?: WasmFriendRequest) {
    this.wasm_friend_request = wasm_friend_request;
  }
  async remote_id() {
    if (api.kind === "Native") {
      return await api.person_protocol_event_next_as_request_remote_id();
    } else if (api.kind === "Web") {
      if (!this.wasm_friend_request) throw new Error("未初始化");
      return this.wasm_friend_request.remote_id();
    } else {
      throw new Error("API缺失");
    }
  }
  async accept() {
    if (api.kind === "Native") {
      await api.person_protocol_event_next_as_request_accept();
    } else if (api.kind === "Web") {
      if (!this.wasm_friend_request) throw new Error("未初始化");
      this.wasm_friend_request.accept();
    } else {
      throw new Error("API缺失");
    }
  }
  async reject() {
    if (api.kind === "Native") {
      await api.person_protocol_event_next_as_request_reject();
    } else if (api.kind === "Web") {
      if (!this.wasm_friend_request) throw new Error("未初始化");
      this.wasm_friend_request.reject();
    } else {
      throw new Error("API缺失");
    }
  }
}
export class ChatRequest {
  private wasm_chat_request?: WasmChatRequest;

  constructor(wasm_chat_request?: WasmChatRequest) {
    this.wasm_chat_request = wasm_chat_request;
  }
  async remote_id() {
    if (api.kind === "Native") {
      return await api.person_protocol_event_next_as_request_remote_id();
    } else if (api.kind === "Web") {
      if (!this.wasm_chat_request) throw new Error("未初始化");
      return this.wasm_chat_request.remote_id();
    } else {
      throw new Error("API缺失");
    }
  }
  async accept() {
    if (api.kind === "Native") {
      return new Connection({
        id: await api.person_protocol_event_next_as_chat_request_accept(),
      });
    } else if (api.kind === "Web") {
      if (!this.wasm_chat_request) throw new Error("未初始化");
      return new Connection({
        wasm_connection: this.wasm_chat_request.accept(),
      });
    } else {
      throw new Error("API缺失");
    }
  }
  async reject() {
    if (api.kind === "Native") {
      await api.person_protocol_event_next_as_request_reject();
    } else if (api.kind === "Web") {
      if (!this.wasm_chat_request) throw new Error("未初始化");
      this.wasm_chat_request.reject();
    } else {
      throw new Error("API缺失");
    }
  }
}

export class Connection {
  private id?: number;
  private wasm_connection?: WasmConnection;

  constructor(options: { id?: number; wasm_connection?: WasmConnection }) {
    this.id = options.id;
    this.wasm_connection = options.wasm_connection;
  }
  async send(message: string) {
    if (api.kind === "Native") {
      if (this.id === undefined) throw new Error("未初始化");
      await api.connection_send(this.id, message);
    } else if (api.kind === "Web") {
      if (!this.wasm_connection) throw new Error("未初始化");
      await this.wasm_connection.send(message);
    } else {
      throw new Error("API缺失");
    }
  }
  async recv() {
    if (api.kind === "Native") {
      if (this.id === undefined) throw new Error("未初始化");
      return await api.connection_recv(this.id);
    } else if (api.kind === "Web") {
      if (!this.wasm_connection) throw new Error("未初始化");
      return await this.wasm_connection.recv();
    } else {
      throw new Error("API缺失");
    }
  }
}

export async function generate_secret_key() {
  if (api.kind === "Native") {
    return await api.generate_secret_key();
  } else if (api.kind === "Web") {
    return api.generate_secret_key();
  } else {
    throw new Error("API缺失");
  }
}
export async function get_secret_key_id(secret_key: Uint8Array) {
  if (api.kind === "Native") {
    return await api.get_secret_key_id(secret_key);
  } else if (api.kind === "Web") {
    return api.get_secret_key_id(secret_key);
  } else {
    throw new Error("API缺失");
  }
}
