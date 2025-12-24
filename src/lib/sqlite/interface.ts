import type { CompiledQuery } from "kysely";
import type { Instance } from "../interface";
import type { SQLiteUpdateEvent } from "./types";

export interface SQLiteAdapter extends Instance {
  open(path: string): Promise<void>;
  close(): Promise<void>;
  execute_sql(sql: string): Promise<void>;
  execute(compiled_query: CompiledQuery): Promise<void>;
  query<T>(compiled_query: CompiledQuery): Promise<T[]>;
  on_update(callback: (event: SQLiteUpdateEvent) => void): void;
}
