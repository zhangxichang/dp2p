import { UserIcon } from "lucide-solid";
import Image from "../widgets/image";
import { createForm } from "@tanstack/solid-form";
import { For, Show } from "solid-js";
import { type } from "arktype";
import { use_main_store } from "../context";
import { QueryBuilder } from "~/lib/query_builder";

const FormSchema = type({
  user_name: type("string > 0").configure({ message: "用户名不能为空" }),
  avatar: "File | null |undefined",
});

export default function Register() {
  const main_store = use_main_store();
  let avatar_file_input: HTMLInputElement | undefined;
  const form = createForm(() => ({
    defaultValues: { user_name: "", avatar: null as File | null | undefined },
    validators: { onChange: FormSchema },
    onSubmit: ({ value }) => {
      console.info(value);
    },
  }));
  const is_submitting = form.useStore((state) => state.isSubmitting);
  return (
    <fieldset class="fieldset bg-base-100 border border-base-300 rounded-box p-6 pt-2">
      <legend class="fieldset-legend">注册账户</legend>
      <label class="label">输入用户名注册你的账户</label>
      <form
        class="flex flex-col pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
      >
        <div class="flex justify-center mb-6">
          <form.Field name="avatar">
            {(field) => (
              <>
                <div
                  class="avatar cursor-pointer"
                  onClick={() => avatar_file_input?.click()}
                >
                  <Show
                    keyed
                    when={field().state.value}
                    fallback={
                      <UserIcon class="size-12 rounded-full bg-base-300" />
                    }
                  >
                    {(v) => <Image class="size-12 rounded-full" image={v} />}
                  </Show>
                </div>
                <input
                  ref={avatar_file_input}
                  name={field().name}
                  onBlur={field().handleBlur}
                  onChange={(e) =>
                    field().handleChange(e.target.files?.item(0))
                  }
                  type="file"
                  accept="image/*"
                  class="hidden"
                />
              </>
            )}
          </form.Field>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-1">
            <form.Field
              name="user_name"
              validators={{
                onSubmitAsync: async ({ value }) => {
                  console.info(
                    await main_store.db.query(
                      QueryBuilder.selectFrom("user")
                        .select((eb) => eb.val(1).as("exists"))
                        .where("name", "=", value)
                        .limit(1)
                        .compile(),
                    ),
                  );
                },
              }}
            >
              {(field) => (
                <>
                  <label class="floating-label">
                    <span>用户名</span>
                    <input
                      name={field().name}
                      value={field().state.value}
                      onBlur={field().handleBlur}
                      onInput={(e) => field().handleChange(e.target.value)}
                      class="input"
                      placeholder="用户名"
                    />
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
            注册
          </button>
        </div>
      </form>
    </fieldset>
  );
}
