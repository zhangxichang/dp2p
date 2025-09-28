import "../style.css";
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
    component: Component,
    head: () => ({
        meta: [{ title: "星链" }]
    })
});
function Component() {
    return <>
        <HeadContent />
        <Outlet />
        <TanStackRouterDevtools />
    </>;
}
