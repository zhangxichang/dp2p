import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/window/app/login")({
  pendingComponent: () => {
    return (
      <div class="flex-1 flex items-center justify-center">
        <span class="loading" />
      </div>
    );
  },
  component: () => {
    return <></>;
  },
});
