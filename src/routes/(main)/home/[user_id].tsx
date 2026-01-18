import { createAsync, useParams } from "@solidjs/router";
import { createSignal, Match, onCleanup, Show, Switch } from "solid-js";
import { HomeContext, use_main_store } from "~/components/context";
import FriendList from "~/components/ui/friend_list";
import SidebarButtonGroup, {
  type SidebarButtonGroupState,
} from "~/components/ui/sidebar_button_group";
import { HomeStore } from "~/stores/home";

export default function Home() {
  const params = useParams<{ user_id: string }>();
  const main_store = use_main_store();
  const store = createAsync(() => HomeStore.new(main_store, params.user_id));
  const [sidebar_button_group_state, set_sidebar_button_group_state] =
    createSignal<SidebarButtonGroupState>("friend");
  return (
    <Show keyed when={store()}>
      {(v) => {
        onCleanup(() => v.cleanup());
        return (
          <HomeContext.Provider value={v}>
            <SidebarButtonGroup set_state={set_sidebar_button_group_state} />
            <div class="w-80 flex flex-col bg-base-100 border border-base-300 rounded-t-box">
              <Switch>
                <Match when={sidebar_button_group_state() === "friend"}>
                  <FriendList />
                </Match>
              </Switch>
            </div>
          </HomeContext.Provider>
        );
      }}
    </Show>
  );
}
