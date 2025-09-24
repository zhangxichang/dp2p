import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/window")({
    component: Component,
});
function Component() {
    const [is_maximized, set_is_maximized] = useState(false);
    useEffect(() => {
        if (isTauri()) {
            const old_title = getCurrentWindow().title();
            getCurrentWindow().setTitle(document.title).catch(console.error);
            const mutation_observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "childList") {
                        getCurrentWindow().setTitle(document.title).catch(console.error);
                    }
                }
            });
            mutation_observer.observe(document.querySelector("title")!, { childList: true });
            const un_on_resized = getCurrentWindow().onResized(async () => set_is_maximized(await getCurrentWindow().isMaximized()));
            return () => {
                mutation_observer.disconnect();
                (async () => {
                    (await un_on_resized)();
                    await getCurrentWindow().setTitle(await old_title);
                })();
            };
        }
    }, []);
    return <>
        <div className="w-screen h-screen flex flex-col bg-neutral-100">
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
            <Navigate to="/window/login" />
        </div>
    </>;
}
