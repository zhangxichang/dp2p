import { Channel, invoke } from "@tauri-apps/api/core";
import type { Person } from "./types";
import type { SQLiteUpdateEvent } from "./sqlite";

export async function fs_remove_file(path: string) {
  try {
    await invoke("fs_remove_file", { path });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function fs_read_file(path: string) {
  try {
    return Uint8Array.from(await invoke("fs_read_file", { path }));
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function fs_create_file(path: string, bytes: Uint8Array) {
  try {
    await invoke("fs_create_file", { path, bytes });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function fs_exists(path: string) {
  try {
    return await invoke<boolean>("fs_exists", { path });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function fs_remove_dir_all(path: string) {
  try {
    await invoke("fs_remove_dir_all", { path });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_open(path: string) {
  try {
    await invoke("sqlite_open", { path });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_is_open() {
  try {
    return await invoke<boolean>("sqlite_is_open");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_close() {
  try {
    await invoke("sqlite_close");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_on_update(
  callback: (event: SQLiteUpdateEvent) => void | Promise<void>,
) {
  try {
    const channel = new Channel<SQLiteUpdateEvent>();
    channel.onmessage = callback;
    await invoke("sqlite_on_update", { channel });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_execute_batch(sql: string) {
  try {
    await invoke("sqlite_execute_batch", { sql });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_execute(sql: string, params: any[]) {
  try {
    await invoke("sqlite_execute", { sql, params });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function sqlite_query<T>(sql: string, params: any[]) {
  try {
    return await invoke<T[]>("sqlite_query", { sql, params });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_generate_secret_key() {
  try {
    return Uint8Array.from(await invoke("endpoint_generate_secret_key"));
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_get_secret_key_id(secret_key: Uint8Array) {
  try {
    return await invoke<string>("endpoint_get_secret_key_id", { secret_key });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_event_next() {
  try {
    return await invoke<string | undefined>("endpoint_event_next");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_create(secret_key: Uint8Array, person: Person) {
  try {
    await invoke("endpoint_create", { secret_key, person });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_is_create() {
  try {
    return await invoke<boolean>("endpoint_is_create");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_request_person(id: string) {
  try {
    return await invoke<Person>("endpoint_request_person", { id });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_request_friend(id: string) {
  try {
    return await invoke<boolean>("endpoint_request_friend", { id });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_request_chat(id: string) {
  try {
    return await invoke<number | undefined>("endpoint_request_chat", { id });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_connection_type(id: string) {
  try {
    return await invoke<string | undefined>("endpoint_connection_type", { id });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_latency(id: string) {
  try {
    return await invoke<number | undefined>("endpoint_latency", { id });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_event_as_request_remote_id() {
  try {
    return await invoke<string>("endpoint_event_as_request_remote_id");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_event_as_request_accept() {
  try {
    await invoke("endpoint_event_as_request_accept");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_event_as_request_reject() {
  try {
    await invoke("endpoint_event_as_request_reject");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_event_as_chat_request_accept() {
  try {
    return await invoke<number>("endpoint_event_as_chat_request_accept");
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_connection_send(id: number, message: string) {
  try {
    await invoke("endpoint_connection_send", { id, message });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
export async function endpoint_connection_recv(id: number) {
  try {
    return await invoke<string | undefined>("endpoint_connection_recv", { id });
  } catch (error) {
    throw new Error(`${error}`);
  }
}
