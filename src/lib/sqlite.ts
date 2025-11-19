import { SQLiteConnection } from "@/worker/sqlite-api";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { CompiledQuery } from "kysely";

type Native = { kind: "Native" } & typeof import("@tauri-apps/api/core");
type Web = { kind: "Web" } & typeof import("@/worker/sqlite-api");

let api: Native | Web;
let event: typeof import("@tauri-apps/api/event");
if (import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Native", ...(await import("@tauri-apps/api/core")) };
  event = await import("@tauri-apps/api/event");
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
  private un_listen_on_update?: UnlistenFn;
  private on_updates = new Array<
    (event: SQLiteUpdateEvent) => void | Promise<void>
  >();

  async init() {
    if (this.schema_sql) return;
    this.schema_sql = await (await fetch("/schema.sql")).text();
  }
  async open(path: string, is_init?: boolean) {
    if (api.kind === "Native") {
      try {
        await api.invoke("sqlite_open", { path });
        await api.invoke("sqlite_on_update");
        this.un_listen_on_update = await event.listen<SQLiteUpdateEvent>(
          "on_update",
          async (e) => {
            for (const callback of this.on_updates) {
              await callback(e.payload);
            }
          },
        );
      } catch (error) {
        throw new Error(undefined, { cause: error });
      }
    } else if (api.kind === "Web") {
      const connection = await SQLiteConnection.new(path);
      connection.on_update(async (e) => {
        for (const callback of this.on_updates) {
          await callback(e);
        }
      });
      this.connection = connection;
    } else {
      throw new Error("API缺失");
    }
    if (is_init && this.schema_sql) {
      try {
        if (api.kind === "Native") {
          try {
            await api.invoke("sqlite_execute_batch", { sql: this.schema_sql });
          } catch (error) {
            throw new Error(undefined, { cause: error });
          }
        } else if (api.kind === "Web") {
          if (!this.connection) throw new Error("没有连接数据库");
          await this.connection.execute(this.schema_sql);
        } else {
          throw new Error("API缺失");
        }
      } catch {}
    }
  }
  async is_open() {
    if (api.kind === "Native") {
      try {
        return await api.invoke<boolean>("sqlite_is_open");
      } catch (error) {
        throw new Error(undefined, { cause: error });
      }
    } else if (api.kind === "Web") {
      return this.connection ? true : false;
    } else {
      throw new Error("API缺失");
    }
  }
  async close() {
    if (api.kind === "Native") {
      try {
        await api.invoke("sqlite_close");
        this.un_listen_on_update?.();
      } catch (error) {
        throw new Error(undefined, { cause: error });
      }
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
        try {
          await api.invoke("sqlite_execute", {
            sql: compiled_query.sql,
            params: compiled_query.parameters,
          });
        } catch (error) {
          throw new Error(undefined, { cause: error });
        }
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
      throw new Error(compiled_query.sql, { cause: error });
    }
  }
  on_update(callback: (event: SQLiteUpdateEvent) => void | Promise<void>) {
    this.on_updates.push(callback);
  }
  unon_update(callback: (event: SQLiteUpdateEvent) => void | Promise<void>) {
    this.on_updates = this.on_updates.filter((value) => value === callback);
  }
}
