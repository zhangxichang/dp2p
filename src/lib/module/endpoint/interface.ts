import type { Module } from "~/lib/module";
import type { Person } from "~/lib/types";

export interface EndpointAdapter extends Module {
  open(secret_key: Uint8Array, person: Person): void | Promise<void>;
  shutdown(): Promise<void>;
}
