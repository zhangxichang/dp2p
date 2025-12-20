import { invoke } from "@tauri-apps/api/core";
import type { FileSystemAdapter } from "./interface";

export class NativeFileSystem implements FileSystemAdapter {
  private constructor() {}
  static new() {
    return new NativeFileSystem();
  }
  async remove_file(path: string) {
    await invoke("remove_file", { path });
  }
}
