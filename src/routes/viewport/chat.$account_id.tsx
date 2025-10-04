import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { Account, Network } from "@zhangxichang/network"
import { Clipboard, Contact, LogOut, UserPlus } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useLiveQuery } from "dexie-react-hooks"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createStore } from "zustand"
import { combine } from "zustand/middleware"
import { Loading } from "@/components/loading"
import { DOMUser } from "@/lib/type"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { TooltipTrigger } from "@radix-ui/react-tooltip"

const Store = createStore(combine({
    network: null as Network | null
}, (set, get) => ({ set, get })))
export const Route = createFileRoute("/viewport/chat/$account_id")({
    component: Component,
    pendingComponent: () => <Loading hint_text="正在加载聊天界面" />,
    beforeLoad: async ({ context, params }) => {
        const store = Store.getState()
        if (!store.get().network) {
            store.set({
                network: await Network.new(Account.from_json((await context.dexie.accounts.get(params.account_id))!))
            })
        }
        return {
            network: store.get().network!
        }
    },
    onLeave: () => Store.getState().set({
        network: null
    })
})
function Component() {
    const context = Route.useRouteContext()
    const params = Route.useParams()
    const [account, set_account] = useState<DOMUser>();
    //好友
    const friends = useLiveQuery(async () => {
        const friends: DOMUser[] = []
        for (const value of await context.dexie.friends.toArray()) {
            friends.push(await DOMUser.from(value))
        }
        return friends
    })
    //好友列表
    const friend_list_ref = useRef(null)
    const friend_list_rows = useVirtualizer({
        getScrollElement: () => friend_list_ref.current,
        count: friends?.length ?? 0,
        estimateSize: () => 56,
    })
    //搜索用户表单规则
    const search_user_form_schema = useMemo(() => z.object({
        user_id: z.string().min(1, "用户ID不能为空"),
    }), [])
    //搜索用户表单
    const search_user_form = useForm<z.infer<typeof search_user_form_schema>>({
        resolver: zodResolver(search_user_form_schema),
        defaultValues: {
            user_id: ""
        }
    })
    useEffect(() => { (async () => set_account(await DOMUser.from(context.network.account())))() }, [])
    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="w-64 flex flex-col border-t border-r rounded-tr-md">
                {/* 好友 */}
                <div className="flex items-center p-2 gap-2 border-b">
                    <Contact />
                    <Label className="font-bold">好友</Label>
                    <Separator orientation="vertical" />
                    <div className="flex-1 flex justify-end">
                        <Dialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button size={"icon"} variant={"outline"} className="size-8"><UserPlus /></Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>添加好友</TooltipContent>
                            </Tooltip>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>添加好友</DialogTitle>
                                    <DialogDescription>输入用户ID按回车进行搜索</DialogDescription>
                                </DialogHeader>
                                <Form {...search_user_form}>
                                    <FormField
                                        control={search_user_form.control}
                                        name="user_id"
                                        render={({ field }) => <>
                                            <FormItem>
                                                <FormLabel>用户ID</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="输入用户ID"
                                                        onKeyDown={async (e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault()
                                                                await search_user_form.handleSubmit(async (form) => {
                                                                    try {
                                                                        toast.info((await context.network.search_user(form.user_id)).name)
                                                                        search_user_form.reset()
                                                                    } catch (error) {
                                                                        search_user_form.setError("user_id", { message: `${error}` })
                                                                    }
                                                                })()
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        </>}
                                    />
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <div ref={friend_list_ref} className="flex-1 overflow-y-auto">
                    <div className="w-full relative" style={{ height: `${friend_list_rows.getTotalSize()}px` }}>
                        {friends && friend_list_rows.getVirtualItems().map((v) => (
                            <Link to="/viewport/chat/$account_id/chatbar/$user_id" params={{ ...params, user_id: friends[v.index].id }}
                                className="absolute top-0 left-0 w-full flex items-center p-2 gap-1 hover:bg-neutral-100"
                                key={v.key}
                                style={{
                                    transform: `translateY(${v.start}px)`,
                                    height: `${v.size}px`,
                                }}
                            >
                                <Avatar className="size-10">
                                    <AvatarImage src={friends[v.index].avatar_base64_url} />
                                    <AvatarFallback>{friends[v.index].name[0]}</AvatarFallback>
                                </Avatar>
                                <span>{friends[v.index].name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
                {/* 用户 */}
                <div className="flex p-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={"ghost"} className="flex-1 justify-start px-2 py-6">
                                <Avatar>
                                    <AvatarImage src={account?.avatar_base64_url} />
                                    <AvatarFallback>{account?.name[0]}</AvatarFallback>
                                </Avatar>
                                <span>{account?.name}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => { if (account) navigator.clipboard.writeText(account.id) }}>
                                <Clipboard />
                                <span>复制用户ID</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/viewport/login" onClick={async () => await context.network.shutdown()}>
                                    <LogOut />
                                    <span>登出</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Outlet />
        </div>
    )
}
