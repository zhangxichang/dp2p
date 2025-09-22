import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

async function main() {
    createRoot(document.body).render(<StrictMode>
        <RouterProvider router={router} />
    </StrictMode>);
}
await main();
