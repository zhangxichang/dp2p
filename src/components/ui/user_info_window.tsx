import { autoUpdate, computePosition, offset, shift } from "@floating-ui/dom";
import { UserIcon } from "lucide-solid";
import { onCleanup, onMount, Show } from "solid-js";
import type { Person } from "~/lib/types";
import Image from "../widgets/image";

export default function UserInfoWindow(props: {
  trigger_ref: HTMLButtonElement | undefined;
  user_person: (Person & { id: string }) | undefined;
}) {
  let self_ref: HTMLDivElement | undefined;
  onMount(() => {
    if (!props.trigger_ref || !self_ref) {
      throw new Error("对象为空");
    }
    onCleanup(
      autoUpdate(props.trigger_ref, self_ref, async () => {
        if (!props.trigger_ref) {
          throw new Error("对象为空");
        }
        const pos = await computePosition(props.trigger_ref, self_ref, {
          placement: "top",
          middleware: [offset(4), shift({ padding: 8 })],
        });
        Object.assign(self_ref.style, {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
        });
      }),
    );
  });
  const masked_user_id = props.user_person
    ? `${props.user_person.id.slice(0, 4)}...${props.user_person.id.slice(-4)}`
    : undefined;
  return (
    <div
      ref={self_ref}
      class="absolute flex bg-base-100 border border-base-300 rounded-box p-2 flex-col gap-2"
    >
      <div class="flex">
        <div class="avatar">
          <Show
            keyed
            when={props.user_person?.avatar}
            fallback={<UserIcon class="size-12 rounded-full bg-base-300" />}
          >
            {(v) => <Image class="size-10 rounded-box" image={v} />}
          </Show>
        </div>
        <div class="flex flex-col items-start px-2">
          <span>{props.user_person?.name}</span>
          <span class="text-xs text-base-content/60">
            {props.user_person?.bio}
          </span>
        </div>
      </div>
      <div class="flex gap-1">
        <span>ID:</span>
        <div class="tooltip" data-tip="点击复制ID">
          <span
            class="link link-hover"
            onClick={() =>
              props.user_person &&
              navigator.clipboard.writeText(props.user_person.id)
            }
          >
            {masked_user_id}
          </span>
        </div>
      </div>
    </div>
  );
}
