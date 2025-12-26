import { createTauRPCProxy, type JsonValue } from "~/generated/ipc_bindings";
import type { SQLiteAdapter } from "./interface";
import type { CompiledQuery } from "kysely";
import type { SQLiteUpdateEvent } from "./types";

export class SQLite implements SQLiteAdapter {
  private proxy?: ReturnType<typeof createTauRPCProxy>["sqlite"];

  init() {
    this.proxy = createTauRPCProxy().sqlite;
  }
  free() {}
  get_proxy() {
    if (!this.proxy) throw new Error("SQLite未初始化");
    return this.proxy;
  }
  async open(path: string) {
    await this.get_proxy().open(path);
  }
  async close() {
    await this.get_proxy().close();
  }
  async execute_sql(sql: string) {
    await this.get_proxy().execute_sql(sql);
  }
  async execute(compiled_query: CompiledQuery) {
    await this.get_proxy().execute(
      compiled_query.sql,
      compiled_query.parameters as JsonValue[],
    );
  }
  async query(compiled_query: CompiledQuery) {
    return (await this.get_proxy().query(
      compiled_query.sql,
      compiled_query.parameters as JsonValue[],
    )) as unknown[];
  }
  async on_update(callback: (event: SQLiteUpdateEvent) => void) {
    await this.get_proxy().on_update(callback);
  }
}
