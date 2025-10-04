import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useRef } from "react"
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
import { Loading } from "@/components/loading"
import { DOMUser } from "@/lib/type"

export const Route = createFileRoute("/viewport/login")({
    component: Component,
    pendingComponent: () => <Loading hint_text="正在加载登录界面" />,
})
function Component() {
    const context = Route.useRouteContext()
    const navigate = useNavigate()
    const register_account_avatar_input_ref = useRef<HTMLInputElement>(null)
    //登录表单规则
    const login_form_schema = useMemo(() => z.object({
        account_id: z.string().min(1, "请选择一个账户"),
        avatar_url: z.string().optional()
    }), [])
    //注册表单规则
    const register_form_schema = useMemo(() => z.object({
        user_name: z.string().min(1, "用户名不能为空"),
        avatar_url: z.string().optional()
    }), [])
    //登录表单
    const login_form = useForm<z.infer<typeof login_form_schema>>({
        resolver: zodResolver(login_form_schema),
        defaultValues: {
            account_id: ""
        }
    })
    //注册表单
    const register_form = useForm<z.infer<typeof register_form_schema>>({
        resolver: zodResolver(register_form_schema),
        defaultValues: {
            user_name: ""
        }
    })
    const login_accounts = useLiveQuery(async () => {
        const login_accounts: DOMUser[] = []
        let is_login_form_reset = true
        for (const value of await context.dexie.accounts.toArray()) {
            login_accounts.push(await DOMUser.from(value))
            if (value.id === login_form.getValues("account_id") && is_login_form_reset) is_login_form_reset = false
        }
        if (is_login_form_reset) login_form.reset()
        return login_accounts
    })
    return (
        <div className="flex-1 flex items-center justify-center">
            <Tabs defaultValue="login">
                <TabsList>
                    <TabsTrigger value="login">登录</TabsTrigger>
                    <TabsTrigger value="register">注册</TabsTrigger>
                </TabsList>
                <Card className="w-82">
                    <CardHeader>
                        <CardTitle>
                            <TabsContent value="login">登录你的账户</TabsContent>
                            <TabsContent value="register">注册你的账户</TabsContent>
                        </CardTitle>
                        <CardDescription>
                            <TabsContent value="login">选择一个账户登录</TabsContent>
                            <TabsContent value="register">输入用户名注册一个新账户，你可以点击头像上传个性化头像</TabsContent>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* 登录表单 */}
                        <TabsContent value="login" asChild>
                            <Form {...login_form}>
                                <div className="flex flex-col gap-1">
                                    <FormField
                                        control={login_form.control}
                                        name="avatar_url"
                                        render={({ field }) => (
                                            <FormItem className="flex justify-center">
                                                <FormControl>
                                                    <Avatar className="size-14">
                                                        <AvatarImage src={field.value} />
                                                        <AvatarFallback><User /></AvatarFallback>
                                                    </Avatar>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={login_form.control}
                                        name="account_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>账户</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={(v) => {
                                                        field.onChange(v)
                                                        login_form.setValue("avatar_url", login_accounts?.find((a) => a.id === v)?.avatar_base64_url);
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
                                                            {login_accounts?.map((value) => (
                                                                <SelectItem
                                                                    key={value.id}
                                                                    value={value.id}
                                                                >
                                                                    {value.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Form>
                        </TabsContent>
                        {/* 注册表单 */}
                        <TabsContent value="register" asChild>
                            <Form {...register_form}>
                                <div className="flex flex-col gap-1">
                                    <FormField
                                        control={register_form.control}
                                        name="avatar_url"
                                        render={({ field }) => (<FormItem className="flex justify-center">
                                            <FormControl>
                                                <Avatar
                                                    className="size-14 cursor-pointer"
                                                    onClick={() => register_account_avatar_input_ref.current?.click()}
                                                >
                                                    <AvatarImage src={field.value} />
                                                    <AvatarFallback><User /></AvatarFallback>
                                                </Avatar>
                                            </FormControl>
                                            <FormMessage />
                                            <input
                                                ref={register_account_avatar_input_ref}
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        if (!file.type.startsWith("image/")) {
                                                            register_form.setError("avatar_url", { message: "请选择一个图片文件" })
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
                                        </FormItem>)}
                                    />
                                    <FormField
                                        control={register_form.control}
                                        name="user_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>用户名</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="输入用户名" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Form>
                        </TabsContent>
                    </CardContent>
                    <CardFooter>
                        <TabsContent value="login" className="flex flex-col gap-1">
                            <Button
                                className="w-full"
                                disabled={login_form.formState.isSubmitting}
                                onClick={login_form.handleSubmit(async (form) => await navigate({
                                    to: "/viewport/chat/$account_id",
                                    params: { account_id: form.account_id }
                                }))}
                            >{login_form.formState.isSubmitting ? "登录中..." : "登录"}</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant={"outline"} className="w-full" onClick={(e) => {
                                        if (login_form.getValues("account_id") === login_form.formState.defaultValues?.account_id) {
                                            login_form.setError("account_id", { message: "请先选择一个账户删除" })
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
                                            await context.dexie.accounts.delete(login_form.getValues("account_id"))
                                            login_form.reset()
                                        }}
                                        >确定</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TabsContent>
                        <TabsContent value="register" asChild>
                            <Button
                                className="w-full"
                                disabled={register_form.formState.isSubmitting}
                                onClick={register_form.handleSubmit(async (form) => {
                                    try {
                                        if ((await context.dexie.accounts.where("name").equals(form.user_name).count()) === 0) {
                                            await context.dexie.accounts.add(Account.new(
                                                form.user_name,
                                                form.avatar_url ? await (await fetch(form.avatar_url)).bytes() : null
                                            ).json())
                                            register_form.reset()
                                            toast.success("账户注册成功")
                                        } else {
                                            register_form.setError("user_name", { message: "用户名已经存在了" })
                                        }
                                    } catch (error) { register_form.setError("user_name", { message: `${error}` }) }
                                })}
                            >注册</Button>
                        </TabsContent>
                    </CardFooter>
                </Card>
            </Tabs>
        </div>
    )
}
