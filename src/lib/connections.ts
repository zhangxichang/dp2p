import type { Connection } from "@starlink/endpoint";

export class Connections {
  private connections = new Map<string, Connection>();
  private on_changes = new Map<
    string,
    (value: Connection | undefined) => void
  >();

  on_change(key: string, callback: (value: Connection | undefined) => void) {
    this.on_changes.set(key, callback);
  }
  set(key: string, value: Connection) {
    this.connections.set(key, value);
    this.on_changes.get(key)?.(value);
  }
  get(key: string) {
    return this.connections.get(key);
  }
  delete(key: string) {
    this.connections.delete(key);
    this.on_changes.get(key)?.(undefined);
    this.on_changes.delete(key);
  }
}
