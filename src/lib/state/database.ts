// #if TAURI_ENV_PLATFORM
// import { invoke } from "@tauri-apps/api/core";
// #else
// import {
//   AsyncDuckDB,
//   AsyncDuckDBConnection,
//   ConsoleLogger,
// } from "@duckdb/duckdb-wasm";
// import duckdb_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-coi.worker.js?url";
// import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-coi.wasm?url";
// import duckdb_pthread_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-coi.pthread.worker.js?url";
// #endif

export class Database {
  // #if !TAURI_ENV_PLATFORM
  // private duckdb?: AsyncDuckDB;
  // private db?: AsyncDuckDBConnection;
  // #endif

  async init() {
    //   // #if TAURI_ENV_PLATFORM
    //   await invoke("state_database_init");
    //   // #else
    //   if (this.duckdb || this.db) return;
    //   const duckdb = new AsyncDuckDB(
    //     new ConsoleLogger(),
    //     new Worker(duckdb_worker),
    //   );
    //   await duckdb.instantiate(duckdb_wasm, duckdb_pthread_worker);
    //   this.duckdb = duckdb;
    //   this.db = await this.duckdb.connect();
    //   // #endif
    // }
    // async delete() {
    //   // #if TAURI_ENV_PLATFORM
    //   await invoke("state_database_delete");
    //   // #else
    //   if (!this.duckdb || !this.db) throw new Error("对象没有初始化");
    //   await this.db.close();
    //   await this.duckdb.dropFile("./data.db");
    //   // #endif
  }
}
