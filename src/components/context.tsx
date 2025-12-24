import { createContext, useContext } from "solid-js";
import type { MainStore } from "~/stores/main";

export const MainContext = createContext<MainStore>();
export function use_main_store() {
  const store = useContext(MainContext);
  if (!store) throw new Error("上下文不存在");
  return store;
}
