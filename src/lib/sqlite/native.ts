import { createTauRPCProxy } from "~/generated/ipc_bindings";
import type { SQLiteAdapter } from "./interface";

export class NativeSQLite implements SQLiteAdapter {
  proxy: ReturnType<typeof createTauRPCProxy>["sqlite"];

  constructor() {
    this.proxy = createTauRPCProxy().sqlite;
  }
  init() {}
  free() {}
  async open(path: string) {
    await this.proxy.open(path);
  }
  async close() {
    await this.proxy.close();
  }
  async execute_sql() {}
  async execute() {}
  async query<T>() {
    const result: T[] = [];
    await Promise.resolve();
    return result;
  }
  on_update() {}
}
