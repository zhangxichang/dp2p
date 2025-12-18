import Worker from "~/worker/sqlite?worker";
import type { SQLiteUpdateEvent } from "~/lib/sqlite";

export type Command =
  | {
      kind: "close";
      return: MessagePort;
    }
  | {
      kind: "execute";
      return: MessagePort;
      sql: string;
      params?: SQLiteCompatibleType[];
    }
  | {
      kind: "query";
      return: MessagePort;
      sql: string;
      params?: SQLiteCompatibleType[];
    }
  | {
      kind: "on_update";
      return: MessagePort;
    };

export type Result<T> =
  | {
      kind: "ok";
      value: T;
    }
  | {
      kind: "error";
      error: Error;
    };

export class SQLiteConnection {
  private worker: Worker;

  private constructor(worker: Worker) {
    this.worker = worker;
  }
  static async new(path: string) {
    return new SQLiteConnection(
      await new Promise<Worker>((resolve) => {
        const worker = new Worker();
        worker.onmessage = () => {
          worker.postMessage(path);
          worker.onmessage = () => resolve(worker);
        };
      }),
    );
  }
  async close() {
    await new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      this.worker.postMessage(
        {
          kind: "close",
          return: port2,
        } satisfies Command,
        { transfer: [port2] },
      );
      port1.onmessage = (e: MessageEvent<Result<null>>) => {
        if (e.data.kind === "ok") {
          resolve(e.data.value);
        } else {
          reject(e.data.error);
        }
      };
    });
    this.worker.terminate();
  }
  async execute(sql: string, params?: SQLiteCompatibleType[]) {
    await new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      this.worker.postMessage(
        {
          kind: "execute",
          return: port2,
          sql,
          params,
        } satisfies Command,
        { transfer: [port2] },
      );
      port1.onmessage = (e: MessageEvent<Result<null>>) => {
        if (e.data.kind === "ok") {
          resolve(e.data.value);
        } else {
          reject(e.data.error);
        }
      };
    });
  }
  async query<T>(sql: string, params?: SQLiteCompatibleType[]) {
    return await new Promise<ReadableStream<T>>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      this.worker.postMessage(
        {
          kind: "query",
          return: port2,
          sql,
          params,
        } satisfies Command,
        { transfer: [port2] },
      );
      port1.onmessage = (e: MessageEvent<Result<ReadableStream<T>>>) => {
        if (e.data.kind === "ok") {
          resolve(e.data.value);
        } else {
          reject(e.data.error);
        }
      };
    });
  }
  on_update(callback: (event: SQLiteUpdateEvent) => void | Promise<void>) {
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage(
      {
        kind: "on_update",
        return: port2,
      } satisfies Command,
      { transfer: [port2] },
    );
    port1.onmessage = (e: MessageEvent<SQLiteUpdateEvent>) => callback(e.data);
  }
}

export function ok<T>(value: T): Result<T> {
  return { kind: "ok", value };
}
export function err(error: Error): Result<never> {
  return { kind: "error", error };
}
