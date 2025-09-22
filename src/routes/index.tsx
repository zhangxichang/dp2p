import { createFileRoute } from "@tanstack/react-router";
import { Loading } from "../components/loading";

export const Route = createFileRoute("/")({
    pendingMs: 0,
    pendingComponent: () => <Loading />,
    component: () => <div className="root"></div>,
});
