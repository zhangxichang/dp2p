import { createAsync, useParams } from "@solidjs/router";
import { createSignal, Match, onCleanup, Show, Switch } from "solid-js";
import { HomeContext, MainContext, use_context } from "~/components/context";
import FriendList from "~/components/ui/friend_list";
import SidebarButtonGroup, {
  type SidebarButtonGroupState,
} from "~/components/ui/sidebar_button_group";
import { HomeStore } from "~/stores/home";

export default function Home() {
  const params = useParams<{ user_id: string }>();
  const main_store = use_context(MainContext);
  const store = createAsync(() => HomeStore.new(main_store, params.user_id));
  const [sidebar_button_group_state, set_sidebar_button_group_state] =
    createSignal<SidebarButtonGroupState>("friend");
  return (
    <Show keyed when={store()}>
      {(v) => {
        onCleanup(() => v.cleanup());
        return (
          <HomeContext.Provider value={v}>
            <div class="flex">
              <SidebarButtonGroup set_state={set_sidebar_button_group_state} />
              <div class="w-80 flex flex-col bg-base-100 border border-base-300 rounded-t-box">
                <Switch>
                  <Match when={sidebar_button_group_state() === "message"}>
                    <div class="flex-1 flex items-center justify-center">
                      <span class="text-base-content font-bold">
                        消息功能待实现
                      </span>
                    </div>
                  </Match>
                  <Match when={sidebar_button_group_state() === "friend"}>
                    <FriendList />
                  </Match>
                  <Match when={sidebar_button_group_state() === "group"}>
                    <div class="flex-1 flex items-center justify-center">
                      <span class="text-base-content font-bold">
                        群组功能待实现
                      </span>
                    </div>
                  </Match>
                </Switch>
              </div>
            </div>
            <div class="flex-1 flex flex-col"></div>
          </HomeContext.Provider>
        );
      }}
    </Show>
  );
}
