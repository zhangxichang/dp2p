import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Account } from "@zhangxichang/network"

export const Route = createFileRoute("/window/app/login")({
    component: Component,
    pendingComponent: PendingComponent,
})

function Component() {
    const context = Route.useRouteContext()
    const navigate = useNavigate()
    const [card_type, set_card_type] = useState("login")
    const login_accounts = useLiveQuery(async () => {
        const login_accounts = []
        for (const v of await context.database.get_all("accounts")) {
            login_accounts.push({
                id: v.id as string,
                name: v.name as string,
                key: v.key as string,
                avatar_url: await new Promise<string | undefined>((resolve, reject) => {
                    if (v.avatar) {
                        const file_reader = new FileReader()
                        file_reader.onload = (e) => resolve(e.target?.result as string)
                        file_reader.onerror = (e) => reject(e.target?.error)
                        file_reader.readAsDataURL(new Blob([Uint8Array.from(v.avatar)]))
                    } else { resolve(undefined) }
                })
            })
        }
        return login_accounts
    })
    const register_account_avatar_input_ref = useRef<HTMLInputElement>(null)
    //登录表单蓝图
    const login_form_schema = z.object({
        account_id: z.string().min(1, "请选择一个账户"),
        avatar_url: z.url().optional()
    })
    //注册表单蓝图
    const register_form_schema = z.object({
        user_name: z.string().min(1, "用户名不能为空"),
        avatar_url: z.url().optional()
    })
    // 登录表单
    const login_form = useForm<z.infer<typeof login_form_schema>>({
        resolver: zodResolver(login_form_schema),
        defaultValues: {
            account_id: ""
        }
    })
    // 注册表单
    const register_form = useForm<z.infer<typeof register_form_schema>>({
        resolver: zodResolver(register_form_schema),
        defaultValues: {
            user_name: ""
        }
    })
    return (
        <div className="flex-1 flex items-center justify-center">
            <Tabs value={card_type} onValueChange={set_card_type}>
                <TabsList>
                    <TabsTrigger value="login">登录</TabsTrigger>
                    <TabsTrigger value="register">注册</TabsTrigger>
                    <TabsTrigger value="advanced">高级</TabsTrigger>
                </TabsList>
                <Card className="w-72">
                    <CardHeader>
                        <CardTitle>
                            <TabsContent value="login">登录你的账户</TabsContent>
                            <TabsContent value="register">注册你的账户</TabsContent>
                            <TabsContent value="advanced">高级配置选项</TabsContent>
                        </CardTitle>
                        <CardDescription>
                            <TabsContent value="login">请在下方选择你的账户进行登录</TabsContent>
                            <TabsContent value="register">输入你的账户信息进行注册</TabsContent>
                            <TabsContent value="advanced">在这里你可以进行一些高级配置操作</TabsContent>
                        </CardDescription>
                    </CardHeader>
                    {card_type !== "advanced" && <>
                        <CardContent>
                            {/* 登录表单 */}
                            <TabsContent value="login" asChild>
                                <Form {...login_form}>
                                    <form
                                        id="login_form"
                                        className="flex flex-col gap-1"
                                        onSubmit={login_form.handleSubmit(async (form) => {
                                            await navigate({ to: "/window/app/chat/$account_id", params: { account_id: form.account_id } })
                                        })}
                                    >
                                        <FormField
                                            control={login_form.control}
                                            name="avatar_url"
                                            render={({ field }) => <FormItem className="flex justify-center">
                                                <FormControl>
                                                    <Avatar className="w-14 h-14">
                                                        <AvatarImage src={field.value} />
                                                        <AvatarFallback><User /></AvatarFallback>
                                                    </Avatar>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>}
                                        />
                                        <FormField
                                            control={login_form.control}
                                            name="account_id"
                                            render={({ field }) => <FormItem>
                                                <FormLabel>账户</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={(v) => {
                                                        field.onChange(v)
                                                        login_form.setValue("avatar_url", login_accounts?.find((a) => a.id === v)?.avatar_url);
                                                    }}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="选择账户" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectLabel>账户</SelectLabel>
                                                            {login_accounts?.map((value, index) => <SelectItem key={index} value={value.id}>
                                                                {value.name}
                                                            </SelectItem>)}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>}
                                        />
                                    </form>
                                </Form>
                            </TabsContent>
                            {/* 注册表单 */}
                            <TabsContent value="register" asChild>
                                <Form {...register_form}>
                                    <form
                                        id="register_form"
                                        className="flex flex-col gap-1"
                                        onSubmit={register_form.handleSubmit(async (form) => {
                                            try {
                                                if (!(await context.database.query("accounts", "name", form.user_name))) {
                                                    await context.database.add("accounts", Account.new(
                                                        form.user_name,
                                                        form.avatar_url ? await (await fetch(form.avatar_url)).bytes() : null
                                                    ).json())
                                                    register_form.reset()
                                                    toast.success("账户注册成功")
                                                } else {
                                                    toast.warning("用户名已存在")
                                                }
                                            } catch (error) { toast.error(`${error}`) }
                                        })}
                                    >
                                        <FormField
                                            control={register_form.control}
                                            name="avatar_url"
                                            render={({ field }) => <FormItem className="flex justify-center">
                                                <FormControl>
                                                    <Avatar
                                                        className="w-14 h-14 cursor-pointer"
                                                        onClick={() => register_account_avatar_input_ref.current?.click()}
                                                    >
                                                        <AvatarImage src={field.value} />
                                                        <AvatarFallback><User /></AvatarFallback>
                                                    </Avatar>
                                                </FormControl>
                                                <input
                                                    ref={register_account_avatar_input_ref}
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: "none" }}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            if (!file.type.startsWith("image/")) {
                                                                toast.warning("请选择一个图片文件")
                                                                return
                                                            }
                                                            field.onChange(await new Promise<string>((resolve, reject) => {
                                                                const file_reader = new FileReader();
                                                                file_reader.onload = (e) => resolve(e.target?.result as string)
                                                                file_reader.onerror = (e) => reject(e.target?.error)
                                                                file_reader.readAsDataURL(file)
                                                            }))
                                                        }
                                                    }}
                                                />
                                                <FormMessage />
                                            </FormItem>}
                                        />
                                        <FormField
                                            control={register_form.control}
                                            name="user_name"
                                            render={({ field }) => <FormItem>
                                                <FormLabel>用户名</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="输入用户名" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>}
                                        />
                                    </form>
                                </Form>
                            </TabsContent>
                        </CardContent>
                        <CardFooter>
                            <TabsContent value="login" className="flex flex-col gap-1">
                                <Button
                                    type="submit"
                                    form="login_form"
                                    className="w-full"
                                    disabled={login_form.formState.isSubmitting}
                                >{login_form.formState.isSubmitting ? "登录中..." : "登录"}
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant={"destructive"} className="w-full" onClick={(e) => {
                                            if (login_form.getValues("account_id") === login_form.formState.defaultValues?.account_id) {
                                                toast.warning("请先选择一个账户删除")
                                                e.preventDefault()
                                            }
                                        }}>删除账户</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>确定要删除选择的账户吗?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                此操作将会删除此账户的所有数据，且无法恢复，请谨慎操作！
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                            <AlertDialogAction onClick={async () => {
                                                await context.database.delete_record("accounts", login_form.getValues("account_id"))
                                                login_form.reset()
                                            }}
                                            >确定</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TabsContent>
                            <TabsContent value="register" asChild>
                                <Button
                                    type="submit"
                                    form="register_form"
                                    className="w-full"
                                    disabled={register_form.formState.isSubmitting}
                                >注册</Button>
                            </TabsContent>
                        </CardFooter>
                    </>}
                    {card_type === "advanced" && <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant={"destructive"} className="w-full">清空所有数据</Button>
                            </AlertDialogTrigger>
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
                                        login_form.reset()
                                        await context.database.clear_all_table()
                                    }}
                                    >确定</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>}
                </Card>
            </Tabs>
        </div>
    )
}

function PendingComponent() {
    return <div className="flex-1 flex items-center justify-center gap-1">
        <div className="select-none font-bold">正在加载登录界面</div>
        <div className="icon-[line-md--loading-loop] w-6 h-6" />
    </div>
}
