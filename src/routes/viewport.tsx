import { Loading } from "@/components/loading"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/components/ui/menubar"
import { Toaster } from "@/components/ui/sonner"
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import Dexie, { type EntityTable } from "dexie"
import { ExternalLink, Info, Maximize, Minimize, Minimize2, X } from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"
import { createStore } from "zustand"
import { combine } from "zustand/middleware"
import { Octokit } from "octokit"
import { open_url } from "@/lib/opener"
import type { UserInfo } from "@/lib/type"
import { init as wasm_init } from "wasm-and-native"

const Store = createStore(combine({
    wasm_inited: false,
    dexie: null as Dexie & {
        users: EntityTable<UserInfo & {
            id: string
            key: Uint8Array
        }, "id">
        friends: EntityTable<UserInfo & {
            owner: string
            id: string
        }, "id">
    } | null
}, (set, get) => ({ set, get })))
export const Route = createFileRoute("/viewport")({
    component: Component,
    pendingComponent: () => <Loading hint_text="正在加载视口" mode="screen" />,
    beforeLoad: async () => {
        const store = Store.getState()
        if (!store.get().wasm_inited) {
            wasm_init()
            store.set({ wasm_inited: true })
        }
        if (!store.get().dexie) {
            const dexie = new Dexie("database")
            dexie.version(1).stores({
                users: "&id,key,name,avatar,bio",
                friends: "&id,owner,name,avatar,bio",
            })
            store.set({ dexie: (await dexie.open()) as any })
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
    const navigate = useNavigate()
    const [is_maximized, set_is_maximized] = useState(false)
    const [about_dialog_opened, set_about_dialog_opened] = useState(false)
    const [clear_all_data_alert_dialog_opened, set_clear_all_data_alert_dialog_opened] = useState(false)
    const [developers, set_developers] = useState<{
        id: number
        name: string | null
        avatar_url: string
        bio: string | null
        html_url: string
    }[]>()
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
    //获取贡献者信息
    useEffect(() => {
        (async () => {
            const github_user_info = await new Octokit().rest.users.getByUsername({ username: "ZhangXiChang" })
            set_developers([{
                id: github_user_info.data.id,
                name: github_user_info.data.name,
                avatar_url: github_user_info.data.avatar_url,
                bio: github_user_info.data.bio,
                html_url: github_user_info.data.html_url
            }])
        })()
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
                                <DialogTitle>关于</DialogTitle>
                                <DialogDescription>两地俱秋夕，相望共星河。</DialogDescription>
                            </DialogHeader>
                            <Label className="font-bold text-lg">贡献者</Label>
                            {developers && <ItemGroup>
                                {developers.map((developer, index) => (
                                    <React.Fragment key={developer.id}>
                                        <Item>
                                            <ItemMedia>
                                                <Avatar>
                                                    <AvatarImage src={developer.avatar_url} />
                                                    <AvatarFallback>{developer.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle>{developer.name}</ItemTitle>
                                                <ItemDescription>{developer.bio}</ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                                <Button variant="outline" size="icon-sm" onClick={() => open_url(developer.html_url)}>
                                                    <ExternalLink />
                                                </Button>
                                            </ItemActions>
                                        </Item>
                                        {index !== developers.length - 1 && <ItemSeparator />}
                                    </React.Fragment>
                                ))}
                            </ItemGroup>}
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
                            variant={"ghost"}
                            className="rounded-none cursor-pointer"
                            onClick={async () => await getCurrentWindow().minimize()}
                        ><Minimize2 /></Button>
                        <Button
                            variant={"ghost"}
                            className="rounded-none cursor-pointer"
                            onClick={async () => await getCurrentWindow().toggleMaximize()}
                        >
                            {!is_maximized ? <Maximize /> : <Minimize />}
                        </Button>
                        <Button
                            variant={"ghost"}
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
