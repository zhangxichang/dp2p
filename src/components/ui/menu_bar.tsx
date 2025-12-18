import { createSignal, ErrorBoundary, lazy, Show, Suspense } from "solid-js";
import ErrorModal from "../modal/error";
import LoadingModal from "../modal/loading";
import WindowControlBar from "./window_control_bar";

const LazyAboutModal = lazy(() => import("~/components/modal/about"));

let tauri_window: typeof import("@tauri-apps/api/window") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  tauri_window = await import("@tauri-apps/api/window");
}

export default function MenuBar() {
  let about_dialog: HTMLDialogElement | undefined;
  const [lazy_about_modal_load, set_lazy_about_modal_load] =
    createSignal(false);
  return (
    <div class="flex items-start">
      <ul class="menu menu-horizontal">
        <li>
          <button
            class="btn btn-sm"
            onClick={() => {
              about_dialog?.showModal();
              set_lazy_about_modal_load(true);
            }}
          >
            关于
          </button>
        </li>
      </ul>
      <dialog ref={about_dialog} class="modal">
        <Show when={lazy_about_modal_load()}>
          <ErrorBoundary fallback={() => <ErrorModal />}>
            <Suspense fallback={<LoadingModal />}>
              <LazyAboutModal />
            </Suspense>
          </ErrorBoundary>
        </Show>
      </dialog>
      <Show when={tauri_window}>
        {(v) => <WindowControlBar tauri_window={v()} />}
      </Show>
    </div>
  );
}
