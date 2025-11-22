import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Check, Clipboard, Contact, Send, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { createStore, useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Link } from "@tanstack/react-router";
import { QueryBuilder } from "@/lib/query_builder";
import { AppStore } from "../app";
import type { ID, Person } from "@/lib/types";
import { Avatar } from "@/components/widgets/avatar";
import { useShallow } from "zustand/shallow";
import type { SQLiteUpdateEvent } from "@/lib/sqlite";
import type { ChatRequest, Connection, FriendRequest } from "@/lib/endpoint";
import { Errored } from "@/components/errored";

export const HomeStore = createStore(
  subscribeWithSelector(() => ({
    user: {} as Person & ID,
    friends: new Map<string, Person & ID>(),
    connections: new Map<string, Connection>(),
  })),
);
export const Route = createFileRoute("/app/home/$user_id")({
  component: Component,
  pendingComponent: () => <Loading hint_text="正在初始化主界面" />,
  errorComponent: () => <Errored hint_text="emmm...出错了呢..." />,
  beforeLoad: async ({ params }) => {
    const update_user = async () => {
      HomeStore.setState({
        user: (
          await AppStore.getState().db.query<Person & ID>(
            QueryBuilder.selectFrom("user")
              .select(["id", "name", "avatar", "bio"])
              .where("id", "=", params.user_id)
              .limit(1)
              .compile(),
          )
        )[0],
      });
    };
    await update_user();
    const on_update_user = async (e: SQLiteUpdateEvent) => {
      if (e.table_name === "user") {
        await update_user();
      }
    };
    AppStore.getState().db.on_update(on_update_user);
    const update_friends = async () => {
      HomeStore.setState({
        friends: new Map(
          (
            await AppStore.getState().db.query<Person & ID>(
              QueryBuilder.selectFrom("friend")
                .select(["id", "name", "avatar", "bio"])
                .where("user_id", "=", params.user_id)
                .compile(),
            )
          ).map((value) => [value.id, value]),
        ),
      });
    };
    await update_friends();
    const on_update_friends = async (e: SQLiteUpdateEvent) => {
      if (e.table_name === "friend") {
        await update_friends();
      }
    };
    AppStore.getState().db.on_update(on_update_friends);
    if (!(await AppStore.getState().endpoint.is_create())) {
      await AppStore.getState().endpoint.create(
        (
          await AppStore.getState().db.query<{ key: Uint8Array }>(
            QueryBuilder.selectFrom("user")
              .select(["key"])
              .where("id", "=", params.user_id)
              .limit(1)
              .compile(),
          )
        )[0].key,
        (
          await AppStore.getState().db.query<Person>(
            QueryBuilder.selectFrom("user")
              .select(["name", "avatar", "bio"])
              .where("id", "=", params.user_id)
              .limit(1)
              .compile(),
          )
        )[0],
      );
      handle_endpoint_event();
    }
    return {
      on_update_user,
      on_update_friends,
    };
  },
});
function Component() {
  const context = Route.useRouteContext();
  const params = Route.useParams();
  const user = useStore(HomeStore, (state) => state.user);
  const friends = useStore(
    HomeStore,
    useShallow((state) => state.friends.values().toArray()),
  );
  const [search_user_result, set_search_user_result] = useState<Person & ID>();
  const [
    send_friend_request_button_disabled,
    set_send_friend_request_button_disabled,
  ] = useState(false);
  //好友列表
  const friend_list_ref = useRef(null);
  const friend_virtualizer = useVirtualizer({
    getScrollElement: () => friend_list_ref.current,
    count: friends.length,
    estimateSize: () => 80,
  });
  //搜索用户表单规则
  const search_user_form_schema = useMemo(
    () =>
      z.object({
        id: z.string().min(1, "用户ID不能为空"),
      }),
    [],
  );
  //搜索用户表单
  const search_user_form = useForm<z.infer<typeof search_user_form_schema>>({
    resolver: zodResolver(search_user_form_schema),
    defaultValues: {
      id: "",
    },
  });
  //清理上下文
  useEffect(
    () => () => {
      AppStore.getState().db.unon_update(context.on_update_user);
      AppStore.getState().db.unon_update(context.on_update_friends);
    },
    [],
  );
  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-80 flex flex-col border-t border-r rounded-tr-md min-h-0">
        {/* 好友 */}
        <div className="flex items-center p-2 gap-2 border-b">
          <Contact />
          <Label className="font-bold">好友</Label>
          <Separator orientation="vertical" />
          <div className="flex-1" />
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
                  name="id"
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
                                  if (
                                    (
                                      await AppStore.getState().db.query(
                                        QueryBuilder.selectFrom("friend")
                                          .where("user_id", "=", params.user_id)
                                          .where("id", "=", form.id)
                                          .limit(1)
                                          .compile(),
                                      )
                                    ).length !== 0
                                  ) {
                                    search_user_form.setError("id", {
                                      message: "已经是你的好友了",
                                    });
                                  }
                                  const person =
                                    await AppStore.getState().endpoint.request_person(
                                      form.id,
                                    );
                                  set_search_user_result({
                                    id: form.id,
                                    ...person,
                                  });
                                  set_send_friend_request_button_disabled(
                                    false,
                                  );
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
                    <Avatar image={search_user_result.avatar}>
                      {search_user_result.name.at(0)}
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{search_user_result.name}</ItemTitle>
                    <ItemDescription>{search_user_result.bio}</ItemDescription>
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
                                  !(await AppStore.getState().endpoint.request_friend(
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
                                    await AppStore.getState().db.execute(
                                      QueryBuilder.insertInto("friend")
                                        .values({
                                          user_id: params.user_id,
                                          ...search_user_result,
                                        })
                                        .compile(),
                                    );
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
        <div ref={friend_list_ref} className="flex-1 overflow-y-auto">
          <div
            className="w-full relative"
            style={{ height: friend_virtualizer.getTotalSize() }}
          >
            {friend_virtualizer.getVirtualItems().map((value) => (
              <Item key={value.key} className="rounded-none" asChild>
                <Link
                  to="/app/home/$user_id/chat/$friend_id"
                  params={{
                    ...params,
                    friend_id: friends[value.index].id,
                  }}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${value.start}px)`,
                    height: `${value.size}px`,
                  }}
                >
                  <ItemMedia>
                    <Avatar
                      className="size-10"
                      image={friends[value.index].avatar}
                    >
                      {friends[value.index].name.at(0)}
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
                    <Avatar className="size-10" image={user.avatar}>
                      {user.name.at(0)}
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{user.name}</ItemTitle>
                    <ItemDescription>{user.bio}</ItemDescription>
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

async function handle_endpoint_event() {
  while (true) {
    const event = await AppStore.getState().endpoint.event_next();
    if (!event) break;
    if (event.kind === "FriendRequest") {
      handle_friend_request_event(event.value);
    } else if (event.kind === "ChatRequest") {
      handle_chat_request_event(event.value);
    }
  }
}
async function handle_friend_request_event(friend_request: FriendRequest) {
  const friend_id = await friend_request.remote_id();
  const friend_info =
    await AppStore.getState().endpoint.request_person(friend_id);
  const toast_id = toast(
    <div className="flex-1">
      <Label className="font-bold">好友请求</Label>
      <Item>
        <ItemMedia>
          <Avatar image={friend_info.avatar}>{friend_info.name.at(0)}</Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{friend_info.name}</ItemTitle>
          <ItemDescription>{friend_info.bio}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={async () => {
              await AppStore.getState().db.execute(
                QueryBuilder.insertInto("friend")
                  .values({
                    id: friend_id,
                    user_id: HomeStore.getState().user.id,
                    ...friend_info,
                  })
                  .compile(),
              );
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
      </Item>
    </div>,
    {
      dismissible: false,
      duration: Infinity,
      classNames: {
        content: "flex-1",
        title: "flex-1 flex",
      },
    },
  );
}
async function handle_chat_request_event(chat_request: ChatRequest) {
  const friend_id = await chat_request.remote_id();
  if (
    (
      await AppStore.getState().db.query(
        QueryBuilder.selectFrom("friend")
          .where("user_id", "=", HomeStore.getState().user.id)
          .where("id", "=", friend_id)
          .limit(1)
          .compile(),
      )
    ).length === 0
  ) {
    chat_request.reject();
  } else {
    const connection = await chat_request.accept();
    HomeStore.setState((old) => ({
      connections: old.connections.set(friend_id, connection),
    }));
    while (true) {
      const connection = HomeStore.getState().connections.get(friend_id);
      if (!connection) break;
      const message = await connection.recv();
      if (!message) break;
      await AppStore.getState().db.execute(
        QueryBuilder.insertInto("message")
          .values({
            sender_id: friend_id,
            text: message,
          })
          .compile(),
      );
    }
    HomeStore.setState((old) => {
      old.connections.delete(friend_id);
      return {
        connections: old.connections,
      };
    });
  }
}
