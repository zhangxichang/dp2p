import { createFileRoute, Outlet, useNavigate } from "@tanstack/solid-router";
import { Endpoint } from "../../lib/endpoint";
import { AppPath, FileSystem } from "../../lib/file_system";
import { Sqlite } from "../../lib/sqlite";
import { onMount } from "solid-js";

export const Route = createFileRoute("/window/app")({
  pendingComponent: () => {
    return (
      <div class="flex-1 flex items-center justify-center">
        <span class="loading" />
      </div>
    );
  },
  loader: async () => {
    const fs = new FileSystem();
    fs.init();
    const db = new Sqlite();
    await db.init();
    if (!(await db.is_open())) {
      await db.open(AppPath.DatabaseFile, true);
    }
    const endpoint = new Endpoint();
    await endpoint.init();
    const on_resets = new Map<string, () => void | Promise<void>>();
    return {
      fs,
      db,
      endpoint,
      on_resets,
    };
  },
  component: () => {
    const navigate = useNavigate();
    onMount(() => void navigate({ to: "/window/app/login" }));
    return <Outlet />;
  },
});
