import type { SQLiteConnection } from "~/worker/sqlite-api";
import type { CompiledQuery } from "kysely";

type Native = { kind: "Native" } & typeof import("~/lib/invoke/sqlite");
type Web = { kind: "Web" } & typeof import("~/worker/sqlite-api");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = { kind: "Native", ...(await import("~/lib/invoke/sqlite")) };
} else {
  api = { kind: "Web", ...(await import("~/worker/sqlite-api")) };
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
  private on_updates = new Map<
    string,
    (event: SQLiteUpdateEvent) => void | Promise<void>
  >();

  async init() {
    if (this.schema_sql !== undefined) return;
    this.schema_sql = await (await fetch("/schema.sql")).text();
  }
  async open(path: string, is_init?: boolean) {
    const callback = async (e: SQLiteUpdateEvent) => {
      for (const callback of this.on_updates.values()) {
        await callback(e);
      }
    };
    if (api.kind === "Native") {
      await api.open(path);
      await api.on_update(callback);
    } else if (api.kind === "Web") {
      const connection = await api.SQLiteConnection.new(path);
      connection.on_update(callback);
      this.connection = connection;
    } else {
      throw new Error("API缺失");
    }
    try {
      if (is_init === true && this.schema_sql !== undefined) {
        if (api.kind === "Native") {
          await api.execute_batch(this.schema_sql);
        } else if (api.kind === "Web") {
          if (!this.connection) throw new Error("没有连接数据库");
          await this.connection.execute(this.schema_sql);
        } else {
          throw new Error("API缺失");
        }
      }
    } catch (error) {
      throw new Error(`初始化数据库出错:${String(error)}\n${this.schema_sql}`);
    }
  }
  async is_open() {
    if (api.kind === "Native") {
      return await api.is_open();
    } else if (api.kind === "Web") {
      return this.connection ? true : false;
    } else {
      throw new Error("API缺失");
    }
  }
  async close() {
    if (api.kind === "Native") {
      await api.close();
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
        await api.execute(
          compiled_query.sql,
          compiled_query.parameters as unknown[],
        );
      } else if (api.kind === "Web") {
        if (!this.connection) throw new Error("没有连接数据库");
        await this.connection.execute(
          compiled_query.sql,
          compiled_query.parameters as SQLiteCompatibleType[],
        );
      } else {
        throw new Error("API缺失");
      }
    } catch (error) {
      throw new Error(`查询错误:${String(error)}\n${compiled_query.sql}`);
    }
  }
  async query<T>(compiled_query: CompiledQuery) {
    try {
      if (api.kind === "Native") {
        return await api.query<T>(
          compiled_query.sql,
          compiled_query.parameters as unknown[],
        );
      } else if (api.kind === "Web") {
        if (!this.connection) throw new Error("没有连接数据库");
        const result: T[] = [];
        for await (const value of await this.connection.query<T>(
          compiled_query.sql,
          compiled_query.parameters as SQLiteCompatibleType[],
        )) {
          result.push(value);
        }
        return result;
      } else {
        throw new Error("API缺失");
      }
    } catch (error) {
      throw new Error(`查询错误:${String(error)}\n${compiled_query.sql}`);
    }
  }
  on_update(
    key: string,
    callback: (event: SQLiteUpdateEvent) => void | Promise<void>,
  ) {
    this.on_updates.set(key, callback);
  }
}
