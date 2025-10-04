import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

const Router = createRouter({
    routeTree,
    history: createMemoryHistory({
        initialEntries: ["/viewport"]
    })
})
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof Router
    }
}
export function render() {
    createRoot(document.body).render(<StrictMode>
        <RouterProvider router={Router} />
    </StrictMode>)
}
