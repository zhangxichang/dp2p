import type { CompiledQuery } from "kysely";
import type { SQLiteUpdateEvent } from "./types";
import type { Module } from "~/lib/module";

export interface SQLiteAdapter extends Module {
  open(path: string): Promise<void>;
  close(): Promise<void>;
  execute_sql(sql: string): Promise<void>;
  execute(compiled_query: CompiledQuery): Promise<void>;
  query(compiled_query: CompiledQuery): Promise<unknown[]>;
  on_update(callback: (event: SQLiteUpdateEvent) => void): void | Promise<void>;
}
