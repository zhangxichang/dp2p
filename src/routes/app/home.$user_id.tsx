import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Check, Clipboard, Contact, Send, UserPlus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createStore } from "zustand";
import { combine } from "zustand/middleware";
import { Loading } from "@/components/loading";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { blob_to_data_url, type UserInfo } from "@/lib/type";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Connection,
  Node,
  SecretKey,
  UserInfo as WasmUserInfo,
} from "@zhangxichang/wasm";
import type Dexie from "dexie";

const Store = createStore(
  combine(
    {
      node: null as Node | null,
      chat_connections: null as Map<string, Connection> | null,
    },
    (set, get) => ({ set, get }),
  ),
);
export const Route = createFileRoute("/app/home/$user_id")({
  component: Component,
  pendingComponent: () => <Loading hint_text="正在初始化主界面" />,
  beforeLoad: async ({ context, params }) => {
    const store = Store.getState();
    const user = (await context.dexie.users
      .where("id")
      .equals(params.user_id)
      .last())!;
    if (!store.get().node) {
      const node = await Node.new(
        SecretKey.from(user.key),
        WasmUserInfo.new(user.name, user.avatar, user.bio),
      );
      store.set({ node });
      handle_friend_request(node, context.dexie, user.id);
    }
    if (!store.get().chat_connections) {
      const chat_connections = new Map<string, Connection>();
      store.set({ chat_connections });
      handle_chat_request(
        store.get().node!,
        context.dexie,
        user.id,
        chat_connections,
      );
    }
    return {
      user: {
        name: user.name,
        avatar_url:
          user.avatar &&
          (await blob_to_data_url(new Blob([Uint8Array.from(user.avatar)]))),
        bio: user.bio,
      },
      node: store.get().node!,
      chat_connections: store.get().chat_connections!,
    };
  },
  onLeave: () =>
    Store.getState().set({
      node: null,
    }),
});
function Component() {
  const context = Route.useRouteContext();
  const params = Route.useParams();
  const [search_user_result, set_search_user_result] = useState<
    Omit<UserInfo, "avatar"> & { id: string; avatar_url?: string }
  >();
  const [
    send_friend_request_button_disabled,
    set_send_friend_request_button_disabled,
  ] = useState(false);
  //好友
  const friends = useLiveQuery(async () => {
    const friends: (Omit<UserInfo, "avatar"> & {
      id: string;
      avatar_url?: string;
    })[] = [];
    for (const value of await context.dexie.friends
      .where("owner")
      .equals(params.user_id)
      .toArray()) {
      friends.push({
        id: value.id,
        name: value.name,
        avatar_url:
          value.avatar &&
          (await blob_to_data_url(new Blob([Uint8Array.from(value.avatar)]))),
        bio: value.bio,
      });
    }
    return friends;
  });
  //好友列表
  const friend_list_ref = useRef(null);
  const friend_virtualizer = useVirtualizer({
    getScrollElement: () => friend_list_ref.current,
    count: friends?.length ?? 0,
    estimateSize: () => 80,
  });
  //搜索用户表单规则
  const search_user_form_schema = useMemo(
    () =>
      z.object({
        user_id: z.string().min(1, "用户ID不能为空"),
      }),
    [],
  );
  //搜索用户表单
  const search_user_form = useForm<z.infer<typeof search_user_form_schema>>({
    resolver: zodResolver(search_user_form_schema),
    defaultValues: {
      user_id: "",
    },
  });
  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-80 flex flex-col border-t border-r rounded-tr-md min-h-0">
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
                    <Button size={"icon-sm"} variant={"outline"}>
                      <UserPlus />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>添加好友</TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加好友</DialogTitle>
                  <DialogDescription>输入用户ID按回车搜索</DialogDescription>
                </DialogHeader>
                <Form {...search_user_form}>
                  <FormField
                    control={search_user_form.control}
                    name="user_id"
                    render={({ field }) => (
                      <>
                        <FormItem>
                          <FormLabel>用户ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="输入用户ID"
                              disabled={search_user_form.formState.isSubmitting}
                              onKeyDown={async (e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                await search_user_form.handleSubmit(
                                  async (form) => {
                                    try {
                                      if (
                                        (await context.dexie.friends
                                          .where("[owner+id]")
                                          .equals([
                                            params.user_id,
                                            form.user_id,
                                          ])
                                          .count()) !== 0
                                      ) {
                                        throw "已经是你的好友了";
                                      }
                                      const user_info =
                                        await context.node.request_user_info(
                                          form.user_id,
                                        );
                                      set_search_user_result({
                                        id: form.user_id,
                                        name: user_info.name(),
                                        avatar_url:
                                          user_info.avatar() &&
                                          (await blob_to_data_url(
                                            new Blob([
                                              Uint8Array.from(
                                                user_info.avatar()!,
                                              ),
                                            ]),
                                          )),
                                        bio: user_info.bio(),
                                      });
                                      set_send_friend_request_button_disabled(
                                        false,
                                      );
                                    } catch (error) {
                                      search_user_form.setError("user_id", {
                                        message: `${error}`,
                                      });
                                    }
                                  },
                                )();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </>
                    )}
                  />
                </Form>
                {search_user_result && (
                  <Item>
                    <ItemMedia>
                      <Avatar>
                        <AvatarImage src={search_user_result.avatar_url} />
                        <AvatarFallback>
                          {search_user_result.name.at(0)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{search_user_result.name}</ItemTitle>
                      <ItemDescription>
                        {search_user_result.bio}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={send_friend_request_button_disabled}
                            onClick={() => {
                              set_send_friend_request_button_disabled(true);
                              toast.promise(
                                async () => {
                                  if (
                                    !(await context.node.request_friend(
                                      search_user_result.id,
                                    ))
                                  ) {
                                    throw "对方拒绝好友请求";
                                  }
                                },
                                {
                                  loading: "等待回应好友请求",
                                  error: (error) => {
                                    set_send_friend_request_button_disabled(
                                      false,
                                    );
                                    return `${error}`;
                                  },
                                  success: () => {
                                    (async () => {
                                      await context.dexie.friends.add({
                                        owner: params.user_id,
                                        id: search_user_result.id,
                                        name: search_user_result.name,
                                        avatar: search_user_result.avatar_url
                                          ? await (
                                              await fetch(
                                                search_user_result.avatar_url,
                                              )
                                            ).bytes()
                                          : undefined,
                                        bio: search_user_result.bio,
                                      });
                                    })();
                                    return "对方同意好友请求";
                                  },
                                },
                              );
                            }}
                          >
                            <Send />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>发送好友请求</TooltipContent>
                      </Tooltip>
                    </ItemActions>
                  </Item>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div ref={friend_list_ref} className="flex-1 overflow-y-auto">
          <div
            className="w-full relative"
            style={{ height: friend_virtualizer.getTotalSize() }}
          >
            {friends &&
              friend_virtualizer.getVirtualItems().map((value) => (
                <Item key={value.key} className="rounded-none" asChild>
                  <Link
                    to="/app/home/$user_id/chat/$friend_id"
                    params={{ ...params, friend_id: friends[value.index].id }}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${value.start}px)`,
                      height: `${value.size}px`,
                    }}
                  >
                    <ItemMedia>
                      <Avatar className="size-10">
                        <AvatarImage src={friends[value.index].avatar_url} />
                        <AvatarFallback>
                          {friends[value.index].name.at(0)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{friends[value.index].name}</ItemTitle>
                      <ItemDescription>
                        {friends[value.index].bio}
                      </ItemDescription>
                    </ItemContent>
                  </Link>
                </Item>
              ))}
          </div>
        </div>
        {/* 用户 */}
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Item variant={"outline"} asChild>
                <a>
                  <ItemMedia>
                    <Avatar className="size-10">
                      <AvatarImage src={context.user.avatar_url} />
                      <AvatarFallback>{context.user.name.at(0)}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{context.user.name}</ItemTitle>
                    <ItemDescription>{context.user.bio}</ItemDescription>
                  </ItemContent>
                </a>
              </Item>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(params.user_id)}
              >
                <Clipboard />
                <span>复制用户ID</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Outlet />
    </div>
  );
}

async function handle_friend_request(
  node: Node,
  dexie: Dexie,
  user_id: string,
) {
  while (true) {
    const friend_request = await node.friend_request_next();
    if (!friend_request) break;
    (async () => {
      const user_info = await node.request_user_info(
        friend_request.remote_node_id(),
      );
      const user_avatar_url =
        user_info.avatar() &&
        (await blob_to_data_url(
          new Blob([Uint8Array.from(user_info.avatar()!)]),
        ));
      const toast_id = toast(
        <Item className="flex-1">
          <ItemMedia>
            <Avatar>
              <AvatarImage src={user_avatar_url} />
              <AvatarFallback>{user_info.name().at(0)}</AvatarFallback>
            </Avatar>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{user_info.name()}</ItemTitle>
            <ItemDescription>{user_info.bio()}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={async () => {
                const friend_id = friend_request.remote_node_id();
                await dexie.table("friends").add({
                  owner: user_id,
                  id: friend_id,
                  name: user_info.name(),
                  avatar: user_info.avatar(),
                  bio: user_info.bio(),
                });
                friend_request.accept();
                toast.dismiss(toast_id);
              }}
            >
              <Check />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                friend_request.reject();
                toast.dismiss(toast_id);
              }}
            >
              <X />
            </Button>
          </ItemActions>
        </Item>,
        {
          duration: Infinity,
          classNames: {
            content: "flex-1",
            title: "flex-1 flex",
          },
        },
      );
    })();
  }
}

async function handle_chat_request(
  node: Node,
  dexie: Dexie,
  user_id: string,
  chat_connections: Map<string, Connection>,
) {
  while (true) {
    const chat_request = await node.chat_request_next();
    if (!chat_request) break;
    (async () => {
      const friend_id = chat_request.remote_node_id();
      if (!(await dexie.table("friends").get([user_id, friend_id]))) {
        chat_request.reject();
      } else {
        const connection = chat_request.accept();
        chat_connections.set(friend_id, connection);
        while (true) {
          const connection = chat_connections.get(friend_id);
          if (!connection) break;
          const message = await connection.read();
          if (!message) break;
          dexie.table("chat_records").add({
            timestamp: Date.now(),
            sender: friend_id,
            receiver: user_id,
            message,
          });
        }
      }
    })();
  }
}
