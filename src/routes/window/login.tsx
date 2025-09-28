import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Database } from "@/lib/database";
import { Network } from "@/lib/network";
import { Account } from "@zhangxichang/network";

declare global {
    var database: Database | null;
    var network: Network | null;
}

export const Route = createFileRoute("/window/login")({
    component: Component,
    pendingComponent: PendingComponent,
    loader: async () => {
        try {
            if (!window.database) {
                window.database = await Database.new();
            }
        } catch (error) {
            toast.error(`${error}`);
            throw new Error(`加载登录路由失败，错误:${error}`);
        }
    }
});
function Component() {
    const [card_type, set_card_type] = useState("login");
    const [selected_account_id, set_selected_account_id] = useState("");
    const [input_account_name, set_input_account_name] = useState("");
    const [refresh_accounts, set_refresh_accounts] = useState(false);
    const accounts = useLiveQuery(() => database!.get_all<Account>("accounts"), [refresh_accounts]);
    const navigate = useNavigate();
    const form_completed = useMemo(() => {
        switch (card_type) {
            case "login": return selected_account_id !== "";
            case "register": return input_account_name !== "";
        }
        return false;
    }, [card_type, selected_account_id, input_account_name]);
    const [is_disabled_main_button, set_is_disabled_main_button] = useState(form_completed);
    const account_avatar_file_input_ref = useRef<HTMLInputElement>(null);
    const [account_avatar_url, set_account_avatar_url] = useState<string>();
    const account_avatar_url_ref = useRef("");
    useEffect(() => {
        if (account_avatar_url) {
            account_avatar_url_ref.current = account_avatar_url;
        }
    }, [account_avatar_url]);
    useEffect(() => () => URL.revokeObjectURL(account_avatar_url_ref.current), []);
    const [selected_account_avatar_url, set_selected_account_avatar_url] = useState<string>();
    const selected_account_avatar_url_ref = useRef("");
    useEffect(() => {
        if (selected_account_avatar_url) {
            selected_account_avatar_url_ref.current = selected_account_avatar_url;
        }
    }, [selected_account_avatar_url]);
    useEffect(() => () => URL.revokeObjectURL(selected_account_avatar_url_ref.current), []);
    return <>
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
                            <TabsContent value="login" asChild>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-center">
                                        <Avatar className="w-14 h-14">
                                            <AvatarImage src={selected_account_avatar_url} />
                                            <AvatarFallback><User /></AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <Label>账户</Label>
                                    <Select value={selected_account_id} onValueChange={async (value) => {
                                        set_selected_account_id(value);
                                        const account = accounts?.find((account) => account.id === value);
                                        if (selected_account_avatar_url) {
                                            URL.revokeObjectURL(selected_account_avatar_url);
                                            set_selected_account_avatar_url(undefined);
                                        }
                                        if (account?.avatar) {
                                            set_selected_account_avatar_url(URL.createObjectURL(new Blob([Uint8Array.from(account.avatar)])));
                                        }
                                    }}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="选择账户" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>账户</SelectLabel>
                                                {accounts?.map((value, index) => <SelectItem key={index} value={value.id}>{value.name}</SelectItem>)}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TabsContent>
                            <TabsContent value="register" asChild>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-center">
                                        <Avatar className="w-14 h-14" onClick={() => account_avatar_file_input_ref.current?.click()}>
                                            <AvatarImage src={account_avatar_url} />
                                            <AvatarFallback><User /></AvatarFallback>
                                            <input ref={account_avatar_file_input_ref} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (!file.type.startsWith("image/")) {
                                                    toast.error("请选择一个图片文件");
                                                    return;
                                                }
                                                if (account_avatar_url) {
                                                    URL.revokeObjectURL(account_avatar_url);
                                                }
                                                set_account_avatar_url(URL.createObjectURL(file));
                                            }} />
                                        </Avatar>
                                    </div>
                                    <Label>用户名</Label>
                                    <Input value={input_account_name} onChange={(e) => set_input_account_name(e.target.value)} placeholder="输入用户名" />
                                </div>
                            </TabsContent>
                        </CardContent>
                        <CardFooter>
                            <Button disabled={!form_completed || is_disabled_main_button} className="w-full" onClick={async () => {
                                set_is_disabled_main_button(true);
                                try {
                                    switch (card_type) {
                                        case "login": {
                                            window.network = await Network.new(Account.from_json(await database!.get("accounts", selected_account_id)));
                                            await navigate({ to: "/window/chat" });
                                            break;
                                        }
                                        case "register": {
                                            await database!.add("accounts", Account.new(
                                                input_account_name,
                                                account_avatar_url ? await (await fetch(account_avatar_url)).bytes() : undefined
                                            ).json());
                                            set_input_account_name("");
                                            if (account_avatar_url) {
                                                URL.revokeObjectURL(account_avatar_url);
                                                set_account_avatar_url(undefined);
                                            }
                                            break;
                                        }
                                    }
                                } catch (error) { toast.error(`${error}`); }
                                set_is_disabled_main_button(false);
                            }}>
                                <TabsContent value="login">登录</TabsContent>
                                <TabsContent value="register">注册</TabsContent>
                            </Button>
                        </CardFooter>
                    </>}
                    {card_type === "advanced" && <>
                        <CardContent>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant={"destructive"} className="w-full">清空所有数据</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>确定要清空所有数据吗?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            此操作将会删除所有应用数据和账户数据，简单来说就是回到第一次使用软件的状态，且无法恢复，请谨慎操作！
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={async () => {
                                            await database!.delete();
                                            set_selected_account_id("");
                                            if (selected_account_avatar_url) {
                                                URL.revokeObjectURL(selected_account_avatar_url);
                                                set_selected_account_avatar_url(undefined);
                                            }
                                            set_refresh_accounts(!refresh_accounts);
                                        }}>确定</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </>}
                </Card>
            </Tabs>
        </div>
    </>;
}
function PendingComponent() {
    return <>
        <div className="flex-1 flex items-center justify-center gap-1">
            <div className="select-none font-bold">正在加载登录界面</div>
            <div className="icon-[line-md--loading-loop] w-6 h-6" />
        </div>
    </>;
}
