import "@/style.css";
import { Toaster } from "@/components/ui/sonner";
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
        <Toaster />
        <Outlet />
        <TanStackRouterDevtools />
    </>;
}
