import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clipboard, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/window/chat")({
    component: Component,
    pendingComponent: PendingComponent,
});
function Component() {
    const navigate = useNavigate();
    const account = useRef(network!.account());
    const [account_avatar_url, set_account_avatar_url] = useState<string>();
    useEffect(() => {
        if (account.current.avatar) {
            const avatar_url = URL.createObjectURL(new Blob([Uint8Array.from(account.current.avatar)]));
            set_account_avatar_url(avatar_url);
            return () => URL.revokeObjectURL(avatar_url);
        }
    }, []);
    return <>
        <div className="flex-1 flex border-t">
            <div className="w-64 flex flex-col border-r">
                <div className="h-12 flex border-b"></div>
                <div className="flex-1 flex flex-col border-b"></div>
                <div className="h-15 flex items-center px-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={"ghost"} className="flex-1 h-11 p-0 justify-start px-2">
                                <Avatar>
                                    <AvatarImage src={account_avatar_url} />
                                    <AvatarFallback>{account.current.name[0]}</AvatarFallback>
                                </Avatar>
                                <span>{account.current.name}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(account.current.id)}>
                                <Clipboard />
                                <span>复制用户ID</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                                await window.network!.shutdown();
                                window.network = null;
                                await navigate({ to: "/window/login" });
                            }}>
                                <LogOut />
                                <span>登出</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="flex-1 flex">
            </div>
        </div>
    </>;
}
function PendingComponent() {
    return <>
        <div className="flex-1 flex items-center justify-center gap-1">
            <div className="select-none font-bold">正在加载聊天界面</div>
            <div className="icon-[line-md--loading-loop] w-6 h-6" />
        </div>
    </>;
}
