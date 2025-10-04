import { Loading } from "@/components/loading"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/components/ui/menubar"
import { Toaster } from "@/components/ui/sonner"
import type { AccountData, UserData } from "@/lib/type"
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import Dexie, { type EntityTable } from "dexie"
import { Info, Maximize, Minimize, Minimize2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createStore } from "zustand"
import { combine } from "zustand/middleware";

const Store = createStore(combine({
    dexie: null as Dexie & {
        accounts: EntityTable<AccountData, "id">
        friends: EntityTable<UserData, "id">
    } | null
}, (set, get) => ({ set, get })))
export const Route = createFileRoute("/viewport")({
    component: Component,
    pendingComponent: () => <Loading hint_text="正在加载视口" mode="screen" />,
    beforeLoad: async () => {
        const store = Store.getState()
        if (!store.get().dexie) {
            const dexie = new Dexie("database")
            dexie.version(1).stores({
                accounts: "&id,name,key,avatar",
                friends: "&id,name,avatar"
            })
            store.set({
                dexie: (await dexie.open()) as any
            })
        }
        return {
            dexie: store.get().dexie!
        }
    },
    onLeave: () => Store.getState().set({
        dexie: null
    })
})
function Component() {
    const context = Route.useRouteContext()
    const is_tauri = useMemo(isTauri, [])
    const navigate = useNavigate();
    const [is_maximized, set_is_maximized] = useState(false)
    const [about_dialog_opened, set_about_dialog_opened] = useState(false)
    const [clear_all_data_alert_dialog_opened, set_clear_all_data_alert_dialog_opened] = useState(false)
    useEffect(() => { navigate({ to: "/viewport/login" }) }, [])
    useEffect(() => {
        if (!is_tauri) return
        //设置窗口标题
        getCurrentWindow().setTitle(document.title)
        //监控网页标题变化
        const title_observer = new MutationObserver(async () => await getCurrentWindow().setTitle(document.title))
        title_observer.observe(document.querySelector("title")!, { childList: true, characterData: true })
        //监控窗口缩放
        const un_on_resized = getCurrentWindow().onResized(async () => set_is_maximized(await getCurrentWindow().isMaximized()))
        return () => {
            title_observer.disconnect();
            (async () => (await un_on_resized)())()
        }
    }, [])
    return <>
        <Toaster />
        <div className="absolute w-dvw h-dvh flex flex-col">
            <div className="flex items-start">
                {/* 菜单按钮 */}
                <div className="p-1">
                    <Menubar>
                        <MenubarMenu>
                            <MenubarTrigger className="font-bold">帮助</MenubarTrigger>
                            <MenubarContent>
                                <MenubarItem onClick={() => set_about_dialog_opened(true)}>
                                    <Info />关于<MenubarShortcut>Ctrl+I</MenubarShortcut>
                                </MenubarItem>
                                <MenubarSeparator />
                                <MenubarSub>
                                    <MenubarSubTrigger>高级选项</MenubarSubTrigger>
                                    <MenubarSubContent>
                                        <MenubarItem variant="destructive" onClick={() => set_clear_all_data_alert_dialog_opened(true)}>
                                            清空所有数据
                                        </MenubarItem>
                                    </MenubarSubContent>
                                </MenubarSub>
                            </MenubarContent>
                        </MenubarMenu>
                    </Menubar>
                    <Dialog open={about_dialog_opened} onOpenChange={set_about_dialog_opened}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-1">
                                    <Info />关于
                                </DialogTitle>
                                <DialogDescription>
                                    不知道写什么的描述
                                </DialogDescription>
                            </DialogHeader>
                            不知道写什么的内容
                        </DialogContent>
                    </Dialog>
                    <AlertDialog open={clear_all_data_alert_dialog_opened} onOpenChange={set_clear_all_data_alert_dialog_opened}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>确定要清空所有数据吗?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    此操作将会删除所有应用数据和账户数据，简单来说就是回到第一次使用的状态，且无法恢复，请谨慎操作！
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                    for (const table of context.dexie.tables) {
                                        table.clear()
                                    }
                                }}>确定</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                {/* 窗口控制按钮 */}
                {is_tauri && (
                    <div data-tauri-drag-region className="flex-1 flex justify-end">
                        <Button
                            size={"icon"} variant={"ghost"}
                            className="rounded-none cursor-pointer"
                            onClick={async () => await getCurrentWindow().minimize()}
                        ><Minimize2 /></Button>
                        <Button
                            size={"icon"} variant={"ghost"}
                            className="rounded-none cursor-pointer"
                            onClick={async () => await getCurrentWindow().toggleMaximize()}
                        >
                            {!is_maximized ? <Maximize /> : <Minimize />}
                        </Button>
                        <Button
                            size={"icon"} variant={"ghost"}
                            className="rounded-none cursor-pointer hover:bg-red-600 hover:text-white active:bg-red-500"
                            onClick={async () => await getCurrentWindow().close()}
                        ><X /></Button>
                    </div>
                )}
            </div>
            <Outlet />
        </div>
    </>
}
