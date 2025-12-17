import { createFileRoute, Outlet, useNavigate } from "@tanstack/solid-router";
import { onCleanup, onMount } from "solid-js";
import { themeChange } from "theme-change";
import { MenuBar } from "../components/ui/menu_bar";

let invoke_log: typeof import("../lib/invoke/log") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  invoke_log = await import("../lib/invoke/log");
}

let tauri_window: typeof import("@tauri-apps/api/window") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  tauri_window = await import("@tauri-apps/api/window");
}

export const Route = createFileRoute("/window")({
  pendingComponent: () => {
    return (
      <div class="absolute w-dvw h-dvh flex items-center justify-center">
        <span class="loading" />
      </div>
    );
  },
  loader: async () => {
    if (invoke_log) {
      self.onunhandledrejection = async (e) => {
        if (e.reason instanceof Error) {
          await invoke_log.log_error(
            e.reason.stack ?? "未捕获的异常:异常没有栈信息",
          );
        } else {
          await invoke_log.log_error("未捕获的异常:非标准异常错误");
        }
      };
    }
    if (tauri_window) {
      //设置窗口标题
      await tauri_window.getCurrentWindow().setTitle(document.title);
    }
  },
  component: () => {
    const navigate = useNavigate();
    onMount(() => {
      themeChange();
      if (tauri_window) {
        //同步标题变化
        const title_observer = new MutationObserver(() =>
          tauri_window.getCurrentWindow().setTitle(document.title),
        );
        title_observer.observe(document.querySelector("title")!, {
          childList: true,
          characterData: true,
        });
        onCleanup(() => title_observer.disconnect());
      }
      void navigate({ to: "/window/app" });
    });
    return (
      <div class="absolute w-dvw h-dvh flex flex-col bg-base-200">
        <MenuBar />
        <Outlet />
      </div>
    );
  },
});
