import wasm_url from "wa-sqlite/dist/wa-sqlite.wasm?url";
import sqlite_esm_factory from "wa-sqlite/dist/wa-sqlite.mjs";
import * as sqlite from "wa-sqlite";
//@ts-expect-error
import { OPFSCoopSyncVFS as VFS } from "wa-sqlite/src/examples/OPFSCoopSyncVFS";
import { err, ok, type Command } from "./sqlite-api";
import type { SQLiteUpdateEvent } from "@/lib/sqlite";

(async () => {
  const module = await sqlite_esm_factory({ locateFile: () => wasm_url });
  const sqlite_api = sqlite.Factory(module);
  const vfs = await VFS.create("opfs", module);
  sqlite_api.vfs_register(vfs);
  const db = await new Promise<number>((resolve) => {
    onmessage = async (e: MessageEvent<string>) => {
      resolve(
        await sqlite_api.open_v2(
          e.data,
          sqlite.SQLITE_OPEN_CREATE | sqlite.SQLITE_OPEN_READWRITE,
          "opfs",
        ),
      );
    };
    postMessage(null);
  });
  onmessage = async (e: MessageEvent<Command>) => {
    try {
      if (e.data.kind === "close") {
        await sqlite_api.close(db);
        e.data.return.postMessage(ok(null));
      } else if (e.data.kind === "execute") {
        for await (const stmt of sqlite_api.statements(db, e.data.sql)) {
          if (e.data.params) sqlite_api.bind_collection(stmt, e.data.params);
          await sqlite_api.step(stmt);
        }
        e.data.return.postMessage(ok(null));
      } else if (e.data.kind === "query") {
        const args = { sql: e.data.sql, params: e.data.params };
        const readable_stream = new ReadableStream({
          start: async (controller) => {
            try {
              for await (const stmt of sqlite_api.statements(db, args.sql)) {
                if (args.params) sqlite_api.bind_collection(stmt, args.params);
                while ((await sqlite_api.step(stmt)) === sqlite.SQLITE_ROW) {
                  const object: Record<string, any> = {};
                  for (let i = 0; i < sqlite_api.column_count(stmt); i++) {
                    object[sqlite_api.column_name(stmt, i)] = structuredClone(
                      sqlite_api.column(stmt, i),
                    );
                  }
                  controller.enqueue(object);
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
        e.data.return.postMessage(ok(readable_stream), {
          transfer: [readable_stream],
        });
      } else if (e.data.kind === "on_update") {
        sqlite_api.update_hook(
          db,
          (update_type, db_name, table_name, row_id) => {
            e.data.return.postMessage({
              update_type,
              db_name,
              table_name,
              row_id,
            } satisfies SQLiteUpdateEvent);
          },
        );
      }
    } catch (error) {
      e.data.return.postMessage(err(new Error(`命令执行失败:${error}`)));
    }
  };
  postMessage(null);
})();
