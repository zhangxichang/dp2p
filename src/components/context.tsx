import { createContext, useContext, type Context } from "solid-js";
import type { HomeStore } from "~/stores/home";
import type { MainStore } from "~/stores/main";

export function use_context<T>(context: Context<T | undefined>) {
  const store = useContext(context);
  if (store === undefined) throw new Error("上下文不存在");
  return store;
}
export const MainContext = createContext<MainStore>();
export const HomeContext = createContext<HomeStore>();
