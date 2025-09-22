import "./__root.css";
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
    head: () => ({
        meta: [{ title: "星链" }]
    }),
    component: () => <>
        <HeadContent />
        <Outlet />
        <TanStackRouterDevtools />
    </>
});
