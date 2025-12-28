import type { Person } from "~/lib/types";
import type { Init } from "../interface";

export interface EndpointModule extends Init {
  create_endpoint(secret_key: Uint8Array, person: Person): Promise<Endpoint>;
  generate_secret_key(): Uint8Array;
  get_secret_key_id(secret_key: Uint8Array): string;
}

export interface Endpoint {
  close(): Promise<void>;
}
