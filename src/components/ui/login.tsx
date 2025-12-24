import { createAsync } from "@solidjs/router";
import { UserIcon } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import type { ID, Person } from "~/lib/types";
import Image from "../widgets/image";
import { type } from "arktype";
import { createForm } from "@tanstack/solid-form";

const FormSchema = type({
  user_id: type("string").configure({ message: "请选择一个账户" }),
});

export default function Login() {
  const users = createAsync<(Person & ID)[]>(async () => {
    await Promise.resolve();
    return [];
  });
  const [preview_avatar, set_preview_avatar] = createSignal<Uint8Array>();
  const form = createForm(() => ({
    defaultValues: { user_id: null as string | null | undefined },
    validators: { onChange: FormSchema },
    onSubmit: ({ value }) => {
      console.info(value);
    },
  }));
  const is_submitting = form.useStore((state) => state.isSubmitting);
  return (
    <fieldset class="fieldset bg-base-100 border border-base-300 rounded-box p-6 pt-2">
      <legend class="fieldset-legend">登录账户</legend>
      <label class="label">选择你的账户登录</label>
      <div class="flex flex-col pt-4">
        <div class="flex justify-center mb-6">
          <div class="avatar">
            <Show
              keyed
              when={preview_avatar()}
              fallback={<UserIcon class="size-12 rounded-full bg-base-300" />}
            >
              {(v) => <Image class="size-12 rounded-full" image={v} />}
            </Show>
          </div>
        </div>
        <form
          class="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await form.handleSubmit();
          }}
        >
          <div class="flex flex-col gap-1">
            <form.Field name="user_id">
              {(field) => (
                <>
                  <label class="floating-label">
                    <span class="text-base-content">账户</span>
                    <select
                      class="select"
                      name={field().name}
                      onBlur={field().handleBlur}
                      onChange={(e) => {
                        const user = users()?.at(Number(e.target.value));
                        set_preview_avatar(user?.avatar);
                        field().handleChange(user?.id);
                      }}
                    >
                      <option disabled={true}>选择账户</option>
                      <For each={users()}>
                        {(v, i) => (
                          <option value={i()}>
                            <div class="avatar">
                              <Show
                                keyed
                                when={v.avatar}
                                fallback={
                                  <UserIcon class="size-8 rounded-full bg-base-300" />
                                }
                              >
                                {(avatar) => (
                                  <Image
                                    class="size-8 rounded-full"
                                    image={avatar}
                                  />
                                )}
                              </Show>
                            </div>
                            <span class="text-base-content">{v.name}</span>
                          </option>
                        )}
                      </For>
                    </select>
                  </label>
                  <Show
                    when={
                      field().state.meta.isTouched &&
                      !field().state.meta.isValid
                    }
                  >
                    <For each={field().state.meta.errors}>
                      {(error) => (
                        <span class="italic text-error">{error?.message}</span>
                      )}
                    </For>
                  </Show>
                </>
              )}
            </form.Field>
          </div>
          <button
            type="submit"
            class="btn btn-neutral"
            disabled={is_submitting()}
          >
            登录
          </button>
          <button
            class="btn"
            onClick={() => {
              console.info(form.state.values.user_id);
            }}
          >
            删除账户
          </button>
        </form>
      </div>
    </fieldset>
  );
}
