import { invoke } from "@tauri-apps/api/core";
import type { Person } from "~/lib/types";

export async function generate_secret_key() {
  try {
    return Uint8Array.from(await invoke("endpoint_generate_secret_key"));
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function get_secret_key_id(secret_key: Uint8Array) {
  try {
    return await invoke<string>("endpoint_get_secret_key_id", { secret_key });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function person_protocol_event_next() {
  try {
    return await invoke<string | undefined>(
      "endpoint_person_protocol_event_next",
    );
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function open(secret_key: Uint8Array, person: Person) {
  try {
    await invoke("endpoint_open", { secret_key, person });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function is_open() {
  try {
    return await invoke<boolean>("endpoint_is_open");
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function close() {
  try {
    await invoke("endpoint_close");
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function request_person(id: string) {
  try {
    return await invoke<Person>("endpoint_request_person", { id });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function request_friend(id: string) {
  try {
    return await invoke<boolean>("endpoint_request_friend", { id });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function request_chat(id: string) {
  try {
    return await invoke<number | undefined>("endpoint_request_chat", { id });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function conn_type(id: string) {
  try {
    return await invoke<string | undefined>("endpoint_conn_type", { id });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function latency(id: string) {
  try {
    return await invoke<number | undefined>("endpoint_latency", { id });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function person_protocol_event_next_as_request_remote_id() {
  try {
    return await invoke<string>(
      "endpoint_person_protocol_event_next_as_request_remote_id",
    );
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function person_protocol_event_next_as_request_accept() {
  try {
    await invoke("endpoint_person_protocol_event_next_as_request_accept");
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function person_protocol_event_next_as_request_reject() {
  try {
    await invoke("endpoint_person_protocol_event_next_as_request_reject");
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function person_protocol_event_next_as_chat_request_accept() {
  try {
    return await invoke<number>(
      "endpoint_person_protocol_event_next_as_chat_request_accept",
    );
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function connection_send(id: number, message: string) {
  try {
    await invoke("endpoint_connection_send", { id, message });
  } catch (error) {
    throw new Error(String(error));
  }
}
export async function connection_recv(id: number) {
  try {
    return await invoke<string | undefined>("endpoint_connection_recv", { id });
  } catch (error) {
    throw new Error(String(error));
  }
}
