import { Loading } from "@/components/loading";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shadcn/components/ui/avatar";
import { Button } from "@/shadcn/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shadcn/components/ui/dialog";
import { Label } from "@/shadcn/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from "@/shadcn/components/ui/menubar";
import { Toaster } from "@/shadcn/components/ui/sonner";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Info, Maximize, Minimize, Minimize2, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Octokit } from "octokit";
import { open_url } from "@/lib/opener";

let tauri_window: typeof import("@tauri-apps/api/window") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  tauri_window = await import("@tauri-apps/api/window");
}

export const Route = createFileRoute("/window")({
  pendingComponent: () => <Loading mode="screen" />,
  component: () => {
    const navigate = useNavigate();
    const [is_maximized, set_is_maximized] = useState<boolean>();
    const [about_dialog_opened, set_about_dialog_opened] = useState(false);
    const [contributors, set_contributors] = useState<
      {
        id?: number;
        avatar_url?: string;
      }[]
    >();
    //导航到子路由
    useEffect(() => {
      void navigate({ to: "/window/app" });
    }, []);
    //窗口配置
    useEffect(() => {
      if (tauri_window) {
        const cleanup = (async () => {
          //设置窗口标题
          await tauri_window.getCurrentWindow().setTitle(document.title);
          //同步标题变化
          const title_observer = new MutationObserver(
            () => void tauri_window.getCurrentWindow().setTitle(document.title),
          );
          title_observer.observe(document.querySelector("title")!, {
            childList: true,
            characterData: true,
          });
          //设置窗口缩放状态
          set_is_maximized(await tauri_window.getCurrentWindow().isMaximized());
          //监控窗口缩放
          const un_on_resized = await tauri_window.getCurrentWindow().onResized(
            () =>
              void (async () => {
                set_is_maximized(
                  await tauri_window.getCurrentWindow().isMaximized(),
                );
              })(),
          );
          return () => {
            title_observer.disconnect();
            un_on_resized();
          };
        })();
        return () => void (async () => (await cleanup)())();
      }
    }, []);
    //获取贡献者信息
    useEffect(() => {
      void (async () => {
        set_contributors(
          (
            await new Octokit().rest.repos.listContributors({
              owner: "ZhangXiChang",
              repo: "starlink",
            })
          ).data.map((v) => ({
            id: v.id,
            avatar_url: v.avatar_url,
          })),
        );
      })();
    }, []);
    return (
      <>
        <Toaster richColors />
        <div className="absolute w-dvw h-dvh flex flex-col">
          <div className="flex items-start">
            {/* 菜单按钮 */}
            <div className="p-1">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger className="font-bold">帮助</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem onClick={() => set_about_dialog_opened(true)}>
                      <Info />
                      关于<MenubarShortcut>Ctrl+I</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
              <Dialog
                open={about_dialog_opened}
                onOpenChange={set_about_dialog_opened}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>关于</DialogTitle>
                    <DialogDescription>
                      两地俱秋夕，相望共星河。
                    </DialogDescription>
                  </DialogHeader>
                  <Label className="font-bold text-lg">贡献者</Label>
                  <div className="flex justify-center">
                    {contributors && (
                      <div className="flex -space-x-2 ring-background ring-2">
                        {contributors.map((contributor) => (
                          <Avatar>
                            <AvatarImage src={contributor.avatar_url} />
                            <AvatarFallback>
                              <User />
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Label className="text-sm text-gray-700">
                      版本 v0.0.12
                    </Label>
                    <div className="flex-1 flex justify-end gap-1">
                      <Button
                        variant="link"
                        className="p-0 text-blue-500"
                        onClick={() =>
                          void open_url(
                            "https://github.com/ZhangXiChang/starlink",
                          )
                        }
                      >
                        源代码
                      </Button>
                      <Button
                        variant="link"
                        className="p-0 text-blue-500"
                        onClick={() =>
                          void open_url(
                            "https://github.com/ZhangXiChang/starlink/graphs/contributors",
                          )
                        }
                      >
                        贡献者列表
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {/* 窗口控制按钮 */}
            {tauri_window && (
              <div data-tauri-drag-region className="flex-1 flex justify-end">
                <Button
                  variant={"ghost"}
                  className="rounded-none cursor-pointer"
                  onClick={() =>
                    void tauri_window.getCurrentWindow().minimize()
                  }
                >
                  <Minimize2 />
                </Button>
                <Button
                  variant={"ghost"}
                  className="rounded-none cursor-pointer"
                  onClick={() =>
                    void tauri_window.getCurrentWindow().toggleMaximize()
                  }
                >
                  {is_maximized === true ? <Maximize /> : <Minimize />}
                </Button>
                <Button
                  variant={"ghost"}
                  className="rounded-none cursor-pointer hover:bg-red-600 hover:text-white active:bg-red-500"
                  onClick={() => void tauri_window.getCurrentWindow().close()}
                >
                  <X />
                </Button>
              </div>
            )}
          </div>
          <Outlet />
        </div>
      </>
    );
  },
});
