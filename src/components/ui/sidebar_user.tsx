import { createAsync, useParams } from "@solidjs/router";
import { QueryBuilder } from "~/lib/query_builder";
import { MainContext, use_context } from "../context";
import type { Person } from "~/lib/types";
import { createSignal, Show } from "solid-js";
import { SettingsIcon, UserIcon } from "lucide-solid";
import Image from "../widgets/image";
import UserInfoWindow from "./user_info_window";

export default function SidebarUser() {
  const main_store = use_context(MainContext);
  const params = useParams<{ user_id: string }>();
  let user_info_window_trigger_ref: HTMLButtonElement | undefined;
  const [is_open_user_info_window, set_is_open_user_info_window] =
    createSignal(false);
  const user_person = createAsync(async () =>
    (
      await main_store.sqlite.query<Person & { id: string }>(
        QueryBuilder.selectFrom("user")
          .select(["id", "name", "avatar", "bio"])
          .where("id", "=", params.user_id)
          .compile(),
      )
    ).at(0),
  );
  return (
    <div class="absolute size-full pointer-events-none flex flex-col justify-end p-2">
      <div class="pointer-events-auto bg-base-100 border border-base-300 rounded-box flex p-2 gap-2">
        <div class="avatar">
          <Show
            keyed
            when={user_person()?.avatar}
            fallback={<UserIcon class="size-12 rounded-full bg-base-300" />}
          >
            {(v) => <Image class="size-10 rounded-box" image={v} />}
          </Show>
        </div>
        <button
          ref={user_info_window_trigger_ref}
          class="btn btn-ghost p-0"
          onClick={() => set_is_open_user_info_window((v) => !v)}
        >
          <div class="flex flex-col items-start px-2">
            <span>{user_person()?.name}</span>
            <span class="text-xs text-base-content/60">
              {user_person()?.bio}
            </span>
          </div>
        </button>
        <Show when={is_open_user_info_window()}>
          <UserInfoWindow
            trigger_ref={user_info_window_trigger_ref}
            user_person={user_person()}
          />
        </Show>
        <div class="flex-1 flex justify-end">
          <button class="btn btn-square btn-ghost">
            <SettingsIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
