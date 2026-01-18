import { MessageCircleMoreIcon, UserIcon, UsersIcon } from "lucide-solid";
import type { Setter } from "solid-js";

export type SidebarButtonGroupState = "message" | "friend" | "group";

export default function SidebarButtonGroup(props: {
  set_state: Setter<SidebarButtonGroupState>;
}) {
  return (
    <div class="join join-vertical px-2">
      <label class="join-item btn btn-square bg-base-100 has-checked:bg-primary has-checked:text-primary-content">
        <input
          type="radio"
          class="hidden"
          name="options"
          onClick={() => props.set_state("message")}
        />
        <MessageCircleMoreIcon />
      </label>
      <label class="join-item btn btn-square bg-base-100 has-checked:bg-primary has-checked:text-primary-content">
        <input
          type="radio"
          class="hidden"
          name="options"
          checked
          onClick={() => props.set_state("friend")}
        />
        <UserIcon />
      </label>
      <label class="join-item btn btn-square bg-base-100 has-checked:bg-primary has-checked:text-primary-content">
        <input
          type="radio"
          class="hidden"
          name="options"
          onClick={() => props.set_state("group")}
        />
        <UsersIcon />
      </label>
    </div>
  );
}
