import type { Remote } from "comlink";
import { create_sqlite } from "~/lib/sqlite";
import type { SQLiteAdapter } from "~/lib/sqlite/interface";
import type { SQLiteUpdateEvent } from "~/lib/sqlite/types";

export class MainStore {
  db: SQLiteAdapter | Remote<SQLiteAdapter>;
  db_on_updates: ((event: SQLiteUpdateEvent) => void)[];

  private constructor(
    db: SQLiteAdapter | Remote<SQLiteAdapter>,
    db_on_updates: ((event: SQLiteUpdateEvent) => void)[],
  ) {
    this.db = db;
    this.db_on_updates = db_on_updates;
  }
  static async new() {
    const db = create_sqlite();
    await db.init();
    await db.open("data.db");
    await db.execute_sql(await (await fetch("/schema.sql")).text());
    const db_on_updates: ((event: SQLiteUpdateEvent) => void)[] = [];
    await db.on_update((event) =>
      db_on_updates.forEach((on_update) => on_update(event)),
    );
    return new MainStore(db, db_on_updates);
  }
  async cleanup() {
    await this.db.close();
    await this.db.free();
  }
}
