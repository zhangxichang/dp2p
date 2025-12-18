import { Maximize, Minimize, Minimize2, X } from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";

export default function WindowControlBar(props: {
  tauri_window: typeof import("@tauri-apps/api/window");
}) {
  const [is_maximized, set_is_maximized] = createSignal<boolean>();
  onMount(() => {
    //设置窗口缩放状态
    void (async () =>
      set_is_maximized(
        await props.tauri_window.getCurrentWindow().isMaximized(),
      ))();
    //监控窗口缩放
    const un_on_resized = props.tauri_window.getCurrentWindow().onResized(() =>
      (async () => {
        set_is_maximized(
          await props.tauri_window.getCurrentWindow().isMaximized(),
        );
      })(),
    );
    onCleanup(async () => (await un_on_resized)());
  });
  return (
    <div data-tauri-drag-region class="flex-1 flex justify-end">
      <button
        class="btn btn-square btn-ghost btn-sm rounded-none"
        onClick={() => props.tauri_window.getCurrentWindow().minimize()}
      >
        <Minimize2 size={"16px"} />
      </button>
      <button
        class="btn btn-square btn-ghost btn-sm rounded-none"
        onClick={() => props.tauri_window.getCurrentWindow().toggleMaximize()}
      >
        <Show when={is_maximized()} fallback={<Maximize size={"16px"} />}>
          <Minimize size={"16px"} />
        </Show>
      </button>
      <button
        class="btn btn-square btn-ghost btn-sm rounded-none btn-error text-base-content"
        onClick={() => props.tauri_window.getCurrentWindow().close()}
      >
        <X size={"16px"} />
      </button>
    </div>
  );
}
