import { expose } from "comlink";
import type { SQLiteAdapter } from "./interface";
import wasm_url from "wa-sqlite/dist/wa-sqlite.wasm?url";
import sqlite_esm_factory from "wa-sqlite/dist/wa-sqlite.mjs";
import * as sqlite from "wa-sqlite";
//@ts-expect-error 导入JS模块
import { OPFSCoopSyncVFS as VFS } from "wa-sqlite/src/examples/OPFSCoopSyncVFS";
import type { CompiledQuery } from "kysely";
import type { SQLiteUpdateEvent } from "./types";

export class SQLite implements SQLiteAdapter {
  private api?: SQLiteAPI;
  private db?: number;

  async init() {
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await sqlite_esm_factory({ locateFile: () => wasm_url });
    const sqlite_api = sqlite.Factory(module);
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const vfs = await VFS.create("opfs", module);
    //eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    sqlite_api.vfs_register(vfs);
    this.api = sqlite_api;
  }
  free() {
    self.close();
  }
  private get_api() {
    if (!this.api) throw new Error("Sqlite没有初始化");
    return this.api;
  }
  async open(path: string) {
    this.db = await this.get_api().open_v2(
      path,
      sqlite.SQLITE_OPEN_CREATE | sqlite.SQLITE_OPEN_READWRITE,
      "opfs",
    );
  }
  private get_db() {
    if (this.db === undefined) throw new Error("没有打开数据库");
    return this.db;
  }
  async close() {
    if (this.db === undefined) return;
    await this.get_api().close(this.db);
    this.db = undefined;
  }
  async execute_sql(sql: string) {
    for await (const stmt of this.get_api().statements(this.get_db(), sql)) {
      await this.get_api().step(stmt);
    }
  }
  async execute(compiled_query: CompiledQuery) {
    for await (const stmt of this.get_api().statements(
      this.get_db(),
      compiled_query.sql,
    )) {
      this.get_api().bind_collection(stmt, compiled_query.parameters as []);
      await this.get_api().step(stmt);
    }
  }
  async query(compiled_query: CompiledQuery) {
    const result: unknown[] = [];
    for await (const stmt of this.get_api().statements(
      this.get_db(),
      compiled_query.sql,
    )) {
      this.get_api().bind_collection(stmt, compiled_query.parameters as []);
      const column_names = this.get_api().column_names(stmt);
      while ((await this.get_api().step(stmt)) === sqlite.SQLITE_ROW) {
        const object: Record<string, unknown> = {};
        for (let i = 0; i < column_names.length; i++) {
          object[column_names[i]] = structuredClone(
            this.get_api().column(stmt, i),
          );
        }
        result.push(object);
      }
    }
    return result;
  }
  on_update(callback: (event: SQLiteUpdateEvent) => void) {
    this.get_api().update_hook(
      this.get_db(),
      (update_type, db_name, table_name, row_id) => {
        callback({ update_type, db_name, table_name, row_id });
      },
    );
  }
}
expose(new SQLite());
