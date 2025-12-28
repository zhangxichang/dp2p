import { createTauRPCProxy, type JsonValue } from "~/generated/ipc_bindings";
import type { SQLite, SQLiteModule } from "./interface";
import type { CompiledQuery } from "kysely";
import type { SQLiteUpdateEvent } from "./types";

export class SQLiteModuleImpl implements SQLiteModule {
  init() {}
  free() {}
  async create_sqlite(path: string) {
    return await SQLiteImpl.new(path);
  }
}

export class SQLiteImpl implements SQLite {
  private id: bigint;
  private on_updates: ((event: SQLiteUpdateEvent) => void)[];

  private constructor(
    id: bigint,
    on_updates: ((event: SQLiteUpdateEvent) => void)[],
  ) {
    this.id = id;
    this.on_updates = on_updates;
  }
  static async new(path: string) {
    const id = await createTauRPCProxy().sqlite.open_db(path);
    const on_updates: ((event: SQLiteUpdateEvent) => void)[] = [];
    await createTauRPCProxy().sqlite.on_update(id, (e) =>
      on_updates.forEach((f) => f(e)),
    );
    return new SQLiteImpl(id, on_updates);
  }
  async close() {
    await createTauRPCProxy().sqlite.close_db(this.id);
  }
  async execute_sql(sql: string) {
    await createTauRPCProxy().sqlite.execute_sql(this.id, sql);
  }
  async execute(compiled_query: CompiledQuery) {
    await createTauRPCProxy().sqlite.execute(
      this.id,
      compiled_query.sql,
      compiled_query.parameters as JsonValue[],
    );
  }
  async query<T>(compiled_query: CompiledQuery) {
    return (await createTauRPCProxy().sqlite.query(
      this.id,
      compiled_query.sql,
      compiled_query.parameters as JsonValue[],
    )) as T[];
  }
  on_update(callback: (event: SQLiteUpdateEvent) => void) {
    this.on_updates.push(callback);
    return () => {
      this.on_updates.splice(this.on_updates.indexOf(callback), 1);
    };
  }
}
