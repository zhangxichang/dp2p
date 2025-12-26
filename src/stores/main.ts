import type { Remote } from "comlink";
import { onCleanup } from "solid-js";
import { create_endpoint } from "~/lib/module/endpoint";
import type { EndpointAdapter } from "~/lib/module/endpoint/interface";
import { create_sqlite } from "~/lib/module/sqlite";
import type { SQLiteAdapter } from "~/lib/module/sqlite/interface";
import type { SQLiteUpdateEvent } from "~/lib/module/sqlite/types";

export class MainStore {
  sqlite: SQLiteAdapter | Remote<SQLiteAdapter>;
  private sqlite_on_updates: ((event: SQLiteUpdateEvent) => void)[];
  endpoint: EndpointAdapter;

  private constructor(
    sqlite: SQLiteAdapter | Remote<SQLiteAdapter>,
    sqlite_on_updates: ((event: SQLiteUpdateEvent) => void)[],
    endpoint: EndpointAdapter,
  ) {
    this.sqlite = sqlite;
    this.sqlite_on_updates = sqlite_on_updates;
    this.endpoint = endpoint;
  }
  static async new() {
    const sqlite = create_sqlite();
    await sqlite.init();
    await sqlite.open("data.db");
    await sqlite.execute_sql(await (await fetch("/schema.sql")).text());
    const sqlite_on_updates: ((event: SQLiteUpdateEvent) => void)[] = [];
    await sqlite.on_update((event) =>
      sqlite_on_updates.forEach((on_update) => on_update(event)),
    );
    const endpoint = create_endpoint();
    await endpoint.init();
    return new MainStore(sqlite, sqlite_on_updates, endpoint);
  }
  async cleanup() {
    await this.sqlite.close();
    await this.sqlite.free();
    this.sqlite_on_updates = [];
    await this.endpoint.shutdown();
    await this.endpoint.free();
  }
  on_sqlite_update(on_update: (event: SQLiteUpdateEvent) => void) {
    this.sqlite_on_updates.push(on_update);
    onCleanup(() => {
      this.sqlite_on_updates.splice(
        this.sqlite_on_updates.indexOf(on_update),
        1,
      );
    });
  }
}
