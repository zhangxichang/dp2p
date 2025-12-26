import type { Remote } from "comlink";
import type { SQLiteAdapter } from "./sqlite/interface";
import type { SQLiteUpdateEvent } from "./sqlite/types";

type Native = { kind: "Native" } & typeof import("./sqlite/native");
type Web = {
  kind: "Web";
  worker: typeof import("*?worker");
} & typeof import("comlink");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = { kind: "Native", ...(await import("./sqlite/native")) };
} else {
  api = {
    kind: "Web",
    worker: await import("./sqlite/web?worker"),
    ...(await import("comlink")),
  };
}

export function create_sqlite(): SQLiteAdapter | Remote<SQLiteAdapter> {
  if (api.kind === "Native") {
    return new api.SQLite();
  } else if (api.kind === "Web") {
    return new Proxy(api.wrap<SQLiteAdapter>(new api.worker.default()), {
      get: (target, p, receiver) => {
        if (p === "on_update") {
          return async (callback: (event: SQLiteUpdateEvent) => void) => {
            return await target.on_update(api.proxy(callback));
          };
        }
        return Reflect.get(target, p, receiver) as unknown;
      },
    });
  } else {
    throw new Error("API缺失");
  }
}
