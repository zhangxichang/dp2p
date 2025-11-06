import type Sqlite from "@tauri-apps/plugin-sql";
import type { Promiser } from "@sqlite.org/sqlite-wasm";
import type { Dispatch, SetStateAction } from "react";

let tauri_sqlite: typeof import("@tauri-apps/plugin-sql") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  tauri_sqlite = await import("@tauri-apps/plugin-sql");
}
let sqlite: typeof import("@sqlite.org/sqlite-wasm") | undefined;
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  sqlite = await import("@sqlite.org/sqlite-wasm");
}
let opfs: typeof import("opfs-worker") | undefined;
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  opfs = await import("opfs-worker");
}
let tauri_fs: typeof import("@tauri-apps/plugin-fs") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  tauri_fs = await import("@tauri-apps/plugin-fs");
}

export class Database {
  private native_inner?: Sqlite;
  private web_inner?: Promiser;
  private callbacks: Map<string, () => void> = new Map();

  async init() {
    if (tauri_sqlite) {
      if (this.native_inner) return;
      const native_db = await tauri_sqlite.default.load("sqlite:data.db");
      await native_db.execute(await (await fetch("/db_schema.sql")).text());
      this.native_inner = native_db;
      return;
    } else if (sqlite) {
      if (this.web_inner) return;
      const web_db = await sqlite.sqlite3Worker1Promiser.v2();
      await web_db("open", {
        vfs: "opfs",
        filename: "data.db",
      });
      await web_db("exec", {
        sql: await (await fetch("/db_schema.sql")).text(),
      });
      this.web_inner = web_db;
      return;
    }
    throw new Error("API缺失");
  }
  async reset() {
    if (tauri_sqlite && tauri_fs) {
      if (!this.native_inner) throw new Error("未初始化");
      let native_inner = this.native_inner;
      this.native_inner = undefined;
      await native_inner.close();
      await tauri_fs.remove("data.db");
      native_inner = await tauri_sqlite.default.load("sqlite:data.db");
      await native_inner.execute(await (await fetch("/db_schema.sql")).text());
      this.native_inner = native_inner;
      return;
    } else if (sqlite && opfs) {
      if (!this.web_inner) throw new Error("未初始化");
      let web_inner = this.web_inner;
      this.web_inner = undefined;
      await web_inner("close", {});
      await opfs.createWorker().remove("data.db");
      await web_inner("open", {
        vfs: "opfs",
        filename: "data.db",
      });
      await web_inner("exec", {
        sql: await (await fetch("/db_schema.sql")).text(),
      });
      this.web_inner = web_inner;
      return;
    }
    throw new Error("API缺失");
  }
  async execute(sql: string, options?: { bind?: any[] }) {
    if (tauri_sqlite) {
      if (!this.native_inner) throw new Error("未初始化");
      await this.native_inner.execute(sql, options?.bind);
      this.callbacks.forEach((f) => f());
      return;
    } else if (sqlite) {
      if (!this.web_inner) throw new Error("未初始化");
      await this.web_inner("exec", { sql, bind: options?.bind });
      this.callbacks.forEach((f) => f());
      return;
    }
    throw new Error("API缺失");
  }
  async query<T>(
    sql: string,
    options?: { bind?: any[]; map?: (value: any) => T | Promise<T> },
  ) {
    if (tauri_sqlite) {
      if (!this.native_inner) throw new Error("未初始化");
      let result = await this.native_inner.select<T[]>(sql, options?.bind);
      if (options?.map) {
        result = await Promise.all(result.map(options.map));
      }
      return result;
    } else if (sqlite) {
      if (!this.web_inner) throw new Error("未初始化");
      let result: T[] = [];
      let result_indexs: number[] = [];
      await this.web_inner("exec", {
        sql,
        bind: options?.bind,
        callback: (value) => {
          if (!value.row) return;
          let obj = {} as any;
          for (let i = 0; i < value.columnNames.length; i++) {
            obj[value.columnNames[i]] = value.row[i];
          }
          result.push(obj);
          result_indexs.push(value.rowNumber);
        },
      });
      result = result
        .map((v, i) => ({
          value: v,
          index: result_indexs[i],
        }))
        .sort((a, b) => a.index - b.index)
        .map(({ value }) => value);
      if (options?.map) {
        result = await Promise.all(result.map(options.map));
      }
      return result;
    }
    throw new Error("API缺失");
  }
  async live_query<T>(
    name: string,
    set: Dispatch<SetStateAction<T[]>>,
    sql: string,
    options?: { bind?: any[]; map?: (value: any) => T | Promise<T> },
  ) {
    set(await this.query<T>(sql, options));
    this.callbacks.set(name, async () =>
      set(await this.query<T>(sql, options)),
    );
  }
}
