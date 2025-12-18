import type { OPFSFileSystem } from "opfs-worker";

type Native = { kind: "Native" } & typeof import("~/lib/invoke/file_system");
type Web = { kind: "Web" } & typeof import("opfs-worker");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = { kind: "Native", ...(await import("~/lib/invoke/file_system")) };
} else {
  api = { kind: "Web", ...(await import("opfs-worker")) };
}

export const AppPath = {
  DatabaseFile: "data.db",
} as const;

export class FileSystem {
  private opfs?: OPFSFileSystem;

  init() {
    if (api.kind === "Native") {
      return;
    } else if (api.kind === "Web") {
      if (this.opfs) return;
      this.opfs = api.createWorker();
    } else {
      throw new Error("API缺失");
    }
  }
  async remove_file(path: string) {
    if (api.kind === "Native") {
      await api.remove_file(path);
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      await this.opfs.remove(path);
    } else {
      throw new Error("API缺失");
    }
  }
  async read_file(path: string) {
    if (api.kind === "Native") {
      return await api.read_file(path);
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      return await this.opfs.readFile(path, "binary");
    } else {
      throw new Error("API缺失");
    }
  }
  async create_file(path: string, bytes: Uint8Array) {
    if (api.kind === "Native") {
      await api.create_file(path, bytes);
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      await this.opfs.writeFile(path, bytes);
    } else {
      throw new Error("API缺失");
    }
  }
  async exists(path: string) {
    if (api.kind === "Native") {
      return await api.exists(path);
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      return await this.opfs.exists(path);
    } else {
      throw new Error("API缺失");
    }
  }
  async remove_dir_all(path: string) {
    if (await this.exists(path)) {
      if (api.kind === "Native") {
        await api.remove_dir_all(path);
      } else if (api.kind === "Web") {
        if (!this.opfs) throw new Error("未初始化");
        await this.opfs.remove(path, { recursive: true });
      } else {
        throw new Error("API缺失");
      }
    }
  }
}
