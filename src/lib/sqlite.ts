import type { DbId, Promiser } from "@sqlite.org/sqlite-wasm";
import type { CompiledQuery } from "kysely";

type Native = { kind: "Native" } & typeof import("@tauri-apps/api/core");
type Web = { kind: "Web" } & typeof import("@sqlite.org/sqlite-wasm");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Native", ...(await import("@tauri-apps/api/core")) };
}
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Web", ...(await import("@sqlite.org/sqlite-wasm")) };
}

export class Sqlite {
  private promiser?: Promiser;
  private dbid?: DbId;
  private on_opens = new Map<string, () => void | Promise<void>>();
  private on_executes = new Map<string, () => void | Promise<void>>();

  async init() {
    if (api.kind === "Native") {
    } else if (api.kind === "Web") {
      if (this.promiser) return;
      this.promiser = await api.sqlite3Worker1Promiser.v2();
    } else {
      throw new Error("API缺失");
    }
  }
  async open(path: string, is_init?: boolean) {
    if (api.kind === "Native") {
      try {
        await api.invoke("sqlite_open", { path });
      } catch (error) {
        throw new Error(undefined, { cause: error });
      }
    } else if (api.kind === "Web") {
      if (!this.promiser) throw new Error("未初始化");
      this.dbid = (
        await this.promiser("open", { vfs: "opfs", filename: path })
      ).dbId;
    } else {
      throw new Error("API缺失");
    }
    if (is_init) {
      const schema_sql = await (await fetch("/schema.sql")).text();
      try {
        if (api.kind === "Native") {
          try {
            await api.invoke("sqlite_execute_batch", { sql: schema_sql });
          } catch (error) {
            throw new Error(undefined, { cause: error });
          }
        } else if (api.kind === "Web") {
          if (!this.promiser) throw new Error("未初始化");
          if (!this.dbid) throw new Error("没有打开数据库");
          await this.promiser("exec", { dbId: this.dbid, sql: schema_sql });
        } else {
          throw new Error("API缺失");
        }
      } catch {}
    }
    this.on_opens.forEach((f) => f());
  }
  async is_open() {
    if (api.kind === "Native") {
      try {
        return await api.invoke<boolean>("sqlite_is_open");
      } catch (error) {
        throw new Error(undefined, { cause: error });
      }
    } else if (api.kind === "Web") {
      return this.dbid ? true : false;
    } else {
      throw new Error("API缺失");
    }
  }
  async close() {
    if (api.kind === "Native") {
      try {
        await api.invoke("sqlite_close");
      } catch (error) {
        throw new Error(undefined, { cause: error });
      }
    } else if (api.kind === "Web") {
      if (!this.promiser) throw new Error("未初始化");
      if (!this.dbid) return;
      let dbId = this.dbid;
      this.dbid = undefined;
      await this.promiser("close", { dbId });
    } else {
      throw new Error("API缺失");
    }
  }
  async execute_batch(sql: string) {
    try {
      if (api.kind === "Native") {
        try {
          await api.invoke("sqlite_execute_batch", { sql });
        } catch (error) {
          throw new Error(undefined, { cause: error });
        }
      } else if (api.kind === "Web") {
        if (!this.promiser) throw new Error("未初始化");
        if (!this.dbid) throw new Error("没有打开数据库");
        await this.promiser("exec", { dbId: this.dbid, sql });
      } else {
        throw new Error("API缺失");
      }
      this.on_executes.forEach((f) => f());
    } catch (error) {
      throw new Error(sql, { cause: error });
    }
  }
  async execute(compiled_query: CompiledQuery) {
    try {
      if (api.kind === "Native") {
        try {
          await api.invoke("sqlite_execute", {
            sql: compiled_query.sql,
            params: compiled_query.parameters,
          });
        } catch (error) {
          throw new Error(undefined, { cause: error });
        }
      } else if (api.kind === "Web") {
        if (!this.promiser) throw new Error("未初始化");
        if (!this.dbid) throw new Error("没有打开数据库");
        await this.promiser("exec", {
          dbId: this.dbid,
          sql: compiled_query.sql,
          bind: compiled_query.parameters,
        });
      } else {
        throw new Error("API缺失");
      }
      this.on_executes.forEach((f) => f());
    } catch (error) {
      throw new Error(compiled_query.sql, { cause: error });
    }
  }
  async query<T>(compiled_query: CompiledQuery) {
    try {
      if (api.kind === "Native") {
        try {
          return await api.invoke<T[]>("sqlite_query", {
            sql: compiled_query.sql,
            params: compiled_query.parameters,
          });
        } catch (error) {
          throw new Error(undefined, { cause: error });
        }
      } else if (api.kind === "Web") {
        if (!this.promiser) throw new Error("未初始化");
        if (!this.dbid) throw new Error("没有打开数据库");
        let result: T[] = [];
        await this.promiser("exec", {
          dbId: this.dbid,
          sql: compiled_query.sql,
          bind: compiled_query.parameters,
          callback: (value) => {
            if (!value.row) return;
            let obj = {} as any;
            for (let i = 0; i < value.columnNames.length; i++) {
              obj[value.columnNames[i]] = value.row[i];
            }
            result.push(obj);
          },
        });
        return result;
      } else {
        throw new Error("API缺失");
      }
    } catch (error) {
      throw new Error(compiled_query.sql, { cause: error });
    }
  }
  on_open(name: string, callback: () => void | Promise<void>) {
    this.on_opens.set(name, callback);
  }
  on_execute(name: string, callback: () => void | Promise<void>) {
    this.on_executes.set(name, callback);
  }
}
