import type { OPFSFileSystem } from "opfs-worker";

type Native = { kind: "Native" } & typeof import("@tauri-apps/api/core");
type Web = { kind: "Web" } & typeof import("opfs-worker");

let api: Native | Web;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Native", ...(await import("@tauri-apps/api/core")) };
}
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  api = { kind: "Web", ...(await import("opfs-worker")) };
}

export const AppPath = {
  DatabaseFile: "data.db",
} as const;

export class FileSystem {
  private opfs?: OPFSFileSystem;

  init() {
    if (api.kind === "Native") {
    } else if (api.kind === "Web") {
      if (this.opfs) return;
      this.opfs = api.createWorker();
    } else {
      throw new Error("API缺失");
    }
  }
  async remove_file(path: string) {
    if (api.kind === "Native") {
      try {
        await api.invoke("fs_remove_file", { path });
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      await this.opfs.remove(path);
    } else {
      throw new Error("API缺失");
    }
  }
  async read_file(path: string) {
    if (api.kind === "Native") {
      try {
        return await api.invoke<Uint8Array>("fs_read_file", { path });
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      return await this.opfs.readFile(path, "binary");
    } else {
      throw new Error("API缺失");
    }
  }
  async create_file(path: string, bytes: Uint8Array) {
    if (api.kind === "Native") {
      try {
        await api.invoke("fs_create_file", { path, bytes });
      } catch (error) {
        throw new Error(`${error}`);
      }
    } else if (api.kind === "Web") {
      if (!this.opfs) throw new Error("未初始化");
      await this.opfs.writeFile(path, bytes);
    } else {
      throw new Error("API缺失");
    }
  }
  async exists(path: string) {
    if (api.kind === "Native") {
      try {
        return await api.invoke<boolean>("fs_exists", { path });
      } catch (error) {
        throw new Error(`${error}`);
      }
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
        try {
          await api.invoke("fs_remove_dir_all", { path });
        } catch (error) {
          throw new Error(`${error}`);
        }
      } else if (api.kind === "Web") {
        if (!this.opfs) throw new Error("未初始化");
        await this.opfs.remove(path, { recursive: true });
      } else {
        throw new Error("API缺失");
      }
    }
  }
}
