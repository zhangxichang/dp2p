import { SQLiteConnection } from "@/worker/sqlite-api";
import type { CompiledQuery } from "kysely";

type Native = { kind: "Native" } & typeof import("@/lib/invoke");
type Web = { kind: "Web" } & typeof import("@/worker/sqlite-api");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Native", ...(await import("@/lib/invoke")) };
}
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Web", ...(await import("@/worker/sqlite-api")) };
}

export interface SQLiteUpdateEvent {
  update_type: number;
  db_name: string | null;
  table_name: string | null;
  row_id: bigint;
}

export class Sqlite {
  private schema_sql?: string;
  private connection?: SQLiteConnection;
  private on_updates = new Array<
    (event: SQLiteUpdateEvent) => void | Promise<void>
  >();

  async init() {
    if (this.schema_sql) return;
    this.schema_sql = await (await fetch("/schema.sql")).text();
  }
  async open(path: string, is_init?: boolean) {
    const callback = async (e: SQLiteUpdateEvent) => {
      for (const callback of this.on_updates) {
        await callback(e);
      }
    };
    if (api.kind === "Native") {
      await api.sqlite_open(path);
      await api.sqlite_on_update(callback);
    } else if (api.kind === "Web") {
      const connection = await SQLiteConnection.new(path);
      connection.on_update(callback);
      this.connection = connection;
    } else {
      throw new Error("API缺失");
    }
    try {
      if (is_init && this.schema_sql) {
        if (api.kind === "Native") {
          await api.sqlite_execute_batch(this.schema_sql);
        } else if (api.kind === "Web") {
          if (!this.connection) throw new Error("没有连接数据库");
          await this.connection.execute(this.schema_sql);
        } else {
          throw new Error("API缺失");
        }
      }
    } catch (error) {
      throw new Error(`初始化数据库出错:${error}\n${this.schema_sql}`);
    }
  }
  async is_open() {
    if (api.kind === "Native") {
      return await api.sqlite_is_open();
    } else if (api.kind === "Web") {
      return this.connection ? true : false;
    } else {
      throw new Error("API缺失");
    }
  }
  async close() {
    if (api.kind === "Native") {
      await api.sqlite_close();
    } else if (api.kind === "Web") {
      if (!this.connection) throw new Error("没有连接数据库");
      const connection = this.connection;
      this.connection = undefined;
      await connection.close();
    } else {
      throw new Error("API缺失");
    }
  }
  async execute(compiled_query: CompiledQuery) {
    try {
      if (api.kind === "Native") {
        await api.sqlite_execute(
          compiled_query.sql,
          compiled_query.parameters as any,
        );
      } else if (api.kind === "Web") {
        if (!this.connection) throw new Error("没有连接数据库");
        await this.connection.execute(
          compiled_query.sql,
          compiled_query.parameters as any,
        );
      } else {
        throw new Error("API缺失");
      }
    } catch (error) {
      throw new Error(`查询错误:${error}\n${compiled_query.sql}`);
    }
  }
  async query<T>(compiled_query: CompiledQuery) {
    try {
      if (api.kind === "Native") {
        return await api.sqlite_query<T>(
          compiled_query.sql,
          compiled_query.parameters as any,
        );
      } else if (api.kind === "Web") {
        if (!this.connection) throw new Error("没有连接数据库");
        let result: T[] = [];
        for await (const value of await this.connection.query<T>(
          compiled_query.sql,
          compiled_query.parameters as any,
        )) {
          result.push(value);
        }
        return result;
      } else {
        throw new Error("API缺失");
      }
    } catch (error) {
      throw new Error(`查询错误:${error}\n${compiled_query.sql}`);
    }
  }
  on_update(callback: (event: SQLiteUpdateEvent) => void | Promise<void>) {
    this.on_updates.push(callback);
  }
  unon_update(callback: (event: SQLiteUpdateEvent) => void | Promise<void>) {
    this.on_updates = this.on_updates.filter((value) => value === callback);
  }
}
