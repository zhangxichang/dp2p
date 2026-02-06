import { HomeContext, use_context } from "../context";
import { tryit } from "radash";

export default function AddFriend() {
  const home_store = use_context(HomeContext);
  let search_user_id_input_ref: HTMLInputElement | undefined;
  const on_search_user = async () => {
    if (
      search_user_id_input_ref !== undefined &&
      search_user_id_input_ref.value != ""
    ) {
      const [err, person] = await tryit((id: string) =>
        home_store.endpoint.request_person(id),
      )(search_user_id_input_ref.value);
      if (err) {
        console.info(err.message);
      } else {
        console.info(person);
      }
    }
  };
  return (
    <div class="modal-box flex flex-col relative">
      <span class="absolute top-3 right-3 select-none text-base-content/60 text-sm">
        按<kbd class="kbd kbd-sm">ESC</kbd>关闭
      </span>
      <span class="text-base-content font-bold text-lg">添加好友</span>
      <span class="text-sm text-base-content/60">两地俱秋夕，相望共星河。</span>
      <div class="flex flex-col mt-3 gap-2">
        <div class="flex flex-col items-start gap-1">
          <span class="font-bold">搜索用户</span>
          <div class="join w-full">
            <input
              ref={search_user_id_input_ref}
              class="join-item input flex-1"
              placeholder="用户ID"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await on_search_user();
                }
              }}
            />
            <button class="join-item btn" onClick={on_search_user}>
              搜索
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
