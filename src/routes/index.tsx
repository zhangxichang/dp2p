import { Toaster } from "@/components/ui/sonner";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
    component: Component,
});
function Component() {
    return <>
        <Outlet />
        <Navigate to="/window" />
        <Toaster />
    </>;
}
