import { Loading } from "@/components/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Toaster } from "@/components/ui/sonner";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  ExternalLink,
  Info,
  Maximize,
  Minimize,
  Minimize2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Octokit } from "octokit";
import { open_url } from "@/lib/opener";
import { AppPath, FileSystem } from "@/lib/file_system";
import { Sqlite } from "@/lib/sqlite";
import { Errored } from "@/components/errored";
import { Endpoint } from "@/lib/endpoint";

let tauri_window: typeof import("@tauri-apps/api/window") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  tauri_window = await import("@tauri-apps/api/window");
}

export const AppStore = createStore(
  subscribeWithSelector(() => ({
    fs: new FileSystem(),
    db: new Sqlite(),
    endpoint: new Endpoint(),
    on_resets: new Map<string, () => void | Promise<void>>(),
  })),
);
export const Route = createFileRoute("/app")({
  component: Component,
  pendingComponent: () => {
    return <Loading hint_text="我现在正在初始化这个程序" mode="screen" />;
  },
  errorComponent: () => {
    return <Errored hint_text="我的天呀，应用程序运行出错了" mode="screen" />;
  },
  beforeLoad: async () => {
    AppStore.getState().fs.init();
    await AppStore.getState().db.init();
    if (!(await AppStore.getState().db.is_open())) {
      await AppStore.getState().db.open(AppPath.DatabaseFile, true);
    }
    await AppStore.getState().endpoint.init();
  },
});
function Component() {
  const router = useRouter();
  const navigate = useNavigate();
  const [is_maximized, set_is_maximized] = useState<boolean>();
  const [about_dialog_opened, set_about_dialog_opened] = useState(false);
  const [
    clear_all_data_alert_dialog_opened,
    set_clear_all_data_alert_dialog_opened,
  ] = useState(false);
  const [developers, set_developers] = useState<
    {
      id: number;
      name: string | null;
      avatar_url: string;
      bio: string | null;
      html_url: string;
    }[]
  >();
  //导航到子路由
  useEffect(() => {
    navigate({ to: "/app/login" });
  }, []);
  //窗口配置
  useEffect(() => {
    if (tauri_window) {
      const cleanup = (async () => {
        //设置窗口标题
        await tauri_window.getCurrentWindow().setTitle(document.title);
        //同步标题变化
        const title_observer = new MutationObserver(
          async () =>
            await tauri_window.getCurrentWindow().setTitle(document.title),
        );
        title_observer.observe(document.querySelector("title")!, {
          childList: true,
          characterData: true,
        });
        //设置窗口缩放状态
        set_is_maximized(await tauri_window.getCurrentWindow().isMaximized());
        //监控窗口缩放
        const un_on_resized = await tauri_window
          .getCurrentWindow()
          .onResized(async () =>
            set_is_maximized(
              await tauri_window.getCurrentWindow().isMaximized(),
            ),
          );
        return () => {
          title_observer.disconnect();
          un_on_resized();
        };
      })();
      return () => {
        (async () => (await cleanup)())();
      };
    }
  }, []);
  //获取贡献者信息
  useEffect(() => {
    (async () => {
      const github_user_info = await new Octokit().rest.users.getByUsername({
        username: "ZhangXiChang",
      });
      set_developers([
        {
          id: github_user_info.data.id,
          name: github_user_info.data.name,
          avatar_url: github_user_info.data.avatar_url,
          bio: github_user_info.data.bio,
          html_url: github_user_info.data.html_url,
        },
      ]);
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
                  <MenubarSeparator />
                  <MenubarSub>
                    <MenubarSubTrigger>高级选项</MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem
                        variant="destructive"
                        onClick={() =>
                          set_clear_all_data_alert_dialog_opened(true)
                        }
                      >
                        清空所有数据
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>
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
                {developers && (
                  <ItemGroup>
                    {developers.map((developer, index) => (
                      <React.Fragment key={developer.id}>
                        <Item>
                          <ItemMedia>
                            <Avatar>
                              <AvatarImage src={developer.avatar_url} />
                              <AvatarFallback>
                                {developer.name?.at(0)}
                              </AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{developer.name}</ItemTitle>
                            <ItemDescription>{developer.bio}</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              onClick={() => open_url(developer.html_url)}
                            >
                              <ExternalLink />
                            </Button>
                          </ItemActions>
                        </Item>
                        {index !== developers.length - 1 && <ItemSeparator />}
                      </React.Fragment>
                    ))}
                  </ItemGroup>
                )}
              </DialogContent>
            </Dialog>
            <AlertDialog
              open={clear_all_data_alert_dialog_opened}
              onOpenChange={set_clear_all_data_alert_dialog_opened}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定要清空所有数据吗?</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将会删除所有应用数据和账户数据，简单来说就是回到第一次使用的状态，且无法恢复，请谨慎操作！
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await AppStore.getState().db.close();
                      await AppStore.getState().fs.remove_file(
                        AppPath.DatabaseFile,
                      );
                      router.clearCache();
                      await navigate({ to: "/app/login" });
                      for (const callback of AppStore.getState().on_resets.values()) {
                        await callback();
                      }
                    }}
                  >
                    确定
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {/* 窗口控制按钮 */}
          {tauri_window && (
            <div data-tauri-drag-region className="flex-1 flex justify-end">
              <Button
                variant={"ghost"}
                className="rounded-none cursor-pointer"
                onClick={async () =>
                  await tauri_window.getCurrentWindow().minimize()
                }
              >
                <Minimize2 />
              </Button>
              <Button
                variant={"ghost"}
                className="rounded-none cursor-pointer"
                onClick={async () =>
                  await tauri_window.getCurrentWindow().toggleMaximize()
                }
              >
                {!is_maximized ? <Maximize /> : <Minimize />}
              </Button>
              <Button
                variant={"ghost"}
                className="rounded-none cursor-pointer hover:bg-red-600 hover:text-white active:bg-red-500"
                onClick={async () =>
                  await tauri_window.getCurrentWindow().close()
                }
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
}
