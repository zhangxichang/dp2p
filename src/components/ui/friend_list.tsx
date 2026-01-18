import { MessagesSquareIcon, UserIcon, UserPlusIcon } from "lucide-solid";
import Image from "../widgets/image";
import { createSignal, For, lazy, Show } from "solid-js";
import { createAsync, useParams } from "@solidjs/router";
import { use_main_store } from "../context";
import { QueryBuilder } from "~/lib/query_builder";
import type { Person } from "~/lib/types";

const LazyAddFriendModal = lazy(() => import("~/components/modal/add_friend"));

export default function FriendList() {
  let add_friend_dialog: HTMLDialogElement | undefined;
  const [lazy_add_friend_modal_load, set_lazy_add_friend_modal_load] =
    createSignal(false);
  const main_store = use_main_store();
  const params = useParams<{ user_id: string }>();
  const friends = createAsync(() =>
    main_store.sqlite.query<Person>(
      QueryBuilder.selectFrom("friend")
        .select(["id", "name", "avatar", "bio"])
        .where("user_id", "=", params.user_id)
        .compile(),
    ),
  );
  return (
    <>
      <div class="flex border-b border-base-300 p-2">
        <div class="flex gap-1 border-r border-base-300 pr-2 items-center">
          <UserIcon />
          <span class="select-none text-base-content text-sm font-bold">
            好友
          </span>
        </div>
        <div class="flex-1 flex justify-end">
          <div class="tooltip" data-tip="添加好友">
            <button
              class="btn btn-square btn-sm bg-base-100"
              onClick={() => {
                add_friend_dialog?.showModal();
                set_lazy_add_friend_modal_load(true);
              }}
            >
              <UserPlusIcon class="size-4" />
            </button>
          </div>
          <dialog ref={add_friend_dialog} class="modal" closedby="closerequest">
            <Show when={lazy_add_friend_modal_load()}>
              <LazyAddFriendModal />
            </Show>
          </dialog>
        </div>
      </div>
      <ul class="list">
        <For each={friends()}>
          {(v) => (
            <li class="list-row">
              <div class="avatar">
                <Image class="size-10 rounded-box" image={v.avatar} />
              </div>
              <div class="flex flex-col">
                <span>{v.name}</span>
                <span class="text-xs text-gray-500">{v.bio}</span>
              </div>
              <button class="btn btn-square btn-ghost">
                <MessagesSquareIcon />
              </button>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
