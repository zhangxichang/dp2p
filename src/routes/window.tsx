import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/window")({
    component: Component,
    pendingComponent: PendingComponent,
})

function Component() {
    const [is_maximized, set_is_maximized] = useState(false)
    useEffect(() => {
        if (isTauri()) {
            //设置窗口标题
            getCurrentWindow().setTitle(document.title).catch(console.error)
            //监控网页标题变化
            const mutation_observer = new MutationObserver(async (mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "childList") {
                        await getCurrentWindow().setTitle(document.title)
                    }
                }
            })
            mutation_observer.observe(document.querySelector("title")!, { childList: true })
            //监控窗口缩放
            const un_on_resized = getCurrentWindow().onResized(async () => set_is_maximized(await getCurrentWindow().isMaximized()))
            return () => {
                mutation_observer.disconnect();
                (async () => (await un_on_resized)())()
            }
        }
    }, [])
    return <div className="w-screen h-screen flex flex-col">
        <div data-tauri-drag-region className="h-8 flex justify-end">
            {isTauri() && <>
                <div className="w-8 flex items-center justify-center hover:bg-neutral-200 active:bg-neutral-300 cursor-pointer"
                    onClick={async () => await getCurrentWindow().minimize()}
                >
                    <div className="icon-[mdi--window-minimize]" />
                </div>
                <div className="w-8 flex items-center justify-center hover:bg-neutral-200 active:bg-neutral-300 cursor-pointer"
                    onClick={async () => await getCurrentWindow().toggleMaximize()}
                >
                    {!is_maximized ? <div className="icon-[mdi--window-maximize]" /> : <div className="icon-[mdi--window-restore]" />}
                </div>
                <div className="w-8 flex items-center justify-center hover:bg-red-600 active:bg-red-500 cursor-pointer"
                    onClick={async () => await getCurrentWindow().close()}
                >
                    <div className="icon-[mdi--window-close]" />
                </div>
            </>}
        </div>
        <Outlet />
        <Navigate to="/window/app" />
    </div>
}

function PendingComponent() {
    return <div className="w-screen h-screen flex items-center justify-center gap-1">
        <div className="select-none font-bold">正在加载窗口</div>
        <div className="icon-[line-md--loading-loop] w-6 h-6" />
    </div>
}
