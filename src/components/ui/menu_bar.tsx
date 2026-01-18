import { createSignal, lazy, Show } from "solid-js";
import WindowControlBar from "./window_control_bar";
import { get_window } from "~/lib/window";

const LazyAboutModal = lazy(() => import("~/components/modal/about"));

export default function MenuBar() {
  let about_dialog: HTMLDialogElement | undefined;
  const [lazy_about_modal_load, set_lazy_about_modal_load] =
    createSignal(false);
  return (
    <div class="flex items-start">
      <ul class="menu menu-horizontal">
        <li>
          <button
            class="btn btn-sm bg-base-100"
            onClick={() => {
              about_dialog?.showModal();
              set_lazy_about_modal_load(true);
            }}
          >
            关于
          </button>
        </li>
      </ul>
      <dialog ref={about_dialog} class="modal" closedby="closerequest">
        <Show when={lazy_about_modal_load()}>
          <LazyAboutModal />
        </Show>
      </dialog>
      <Show keyed when={get_window()}>
        {(v) => <WindowControlBar window={v} />}
      </Show>
    </div>
  );
}
