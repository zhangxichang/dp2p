export interface FileSystemAdapter {
  remove_file(path: string): Promise<void>;
}
