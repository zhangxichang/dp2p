import type { Remote } from "comlink";
import type { SQLiteAdapter } from "./sqlite/interface";

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
    return new api.NativeSQLite();
  } else if (api.kind === "Web") {
    return api.wrap<SQLiteAdapter>(new api.worker.default());
  } else {
    throw new Error("API缺失");
  }
}
