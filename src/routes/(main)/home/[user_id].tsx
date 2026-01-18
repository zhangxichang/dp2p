import { createAsync, useParams } from "@solidjs/router";
import { onCleanup, Show } from "solid-js";
import { HomeContext, use_main_store } from "~/components/context";
import { HomeStore } from "~/stores/home";

export default function Home() {
  const params = useParams<{ user_id: string }>();
  const main_store = use_main_store();
  const store = createAsync(() => HomeStore.new(main_store, params.user_id));
  return (
    <Show keyed when={store()}>
      {(v) => {
        onCleanup(() => v.cleanup());
        return (
          <HomeContext.Provider value={v}>你好，世界</HomeContext.Provider>
        );
      }}
    </Show>
  );
}
