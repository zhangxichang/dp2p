export interface Instance {
  init(): void | Promise<void>;
  free(): void | Promise<void>;
}
