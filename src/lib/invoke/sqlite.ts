import { Channel, invoke } from "@tauri-apps/api/core";
import type { SQLiteUpdateEvent } from "~/lib/sqlite";

export async function open(path: string) {
  try {
    await invoke("sqlite_open", { path });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function is_open() {
  try {
    return await invoke<boolean>("sqlite_is_open");
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function close() {
  try {
    await invoke("sqlite_close");
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function on_update(
  callback: (event: SQLiteUpdateEvent) => void | Promise<void>,
) {
  try {
    const channel = new Channel<SQLiteUpdateEvent>();
    channel.onmessage = (e) => callback(e);
    await invoke("sqlite_on_update", { channel });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function execute_batch(sql: string) {
  try {
    await invoke("sqlite_execute_batch", { sql });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function execute(sql: string, params: unknown[]) {
  try {
    await invoke("sqlite_execute", { sql, params });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function query<T>(sql: string, params: unknown[]) {
  try {
    return await invoke<T[]>("sqlite_query", { sql, params });
  } catch (error) {
    throw new Error(String(error));
  }
}
