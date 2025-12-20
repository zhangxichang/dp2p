import type { FileSystemAdapter } from "./file-system/interface";

type Native = { kind: "Native" } & typeof import("./file-system/native");
type Web = { kind: "Web" } & typeof import("./file-system/web");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = { kind: "Native", ...(await import("./file-system/native")) };
} else {
  api = { kind: "Web", ...(await import("./file-system/web")) };
}

export function create_file_system(): FileSystemAdapter {
  if (api.kind === "Native") {
    return api.NativeFileSystem.new();
  } else if (api.kind === "Web") {
    return api.WebFileSystem.new();
  } else {
    throw new Error("API缺失");
  }
}
