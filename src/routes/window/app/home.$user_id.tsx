import { Button } from "@/shadcn/components/ui/button";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Check,
  Contact,
  Mail,
  Send,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Label } from "@/shadcn/components/ui/label";
import { Separator } from "@/shadcn/components/ui/separator";
import { Loading } from "@/components/loading";
import { Tooltip, TooltipContent } from "@/shadcn/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/shadcn/components/ui/item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shadcn/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/components/ui/form";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/shadcn/components/ui/input";
import { toast } from "sonner";
import { createStore, useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Link } from "@tanstack/react-router";
import { QueryBuilder } from "@/lib/query_builder";
import { AppStore } from "../app";
import type { ID, Person } from "@/lib/types";
import { Avatar } from "@/components/widgets/avatar";
import { useShallow } from "zustand/shallow";
import {
  type ChatRequest,
  type Connection,
  type FriendRequest,
} from "@/lib/endpoint";
import { Errored } from "@/components/errored";
import { ButtonGroup } from "@/shadcn/components/ui/button-group";

export const HomeStore = createStore(
  subscribeWithSelector(() => ({
    user: undefined as (Person & ID) | undefined,
    friends: new Map<string, Person & ID>(),
    connections: new Map<string, Connection>(),
  })),
);
export const Route = createFileRoute("/window/app/home/$user_id")({
  pendingComponent: () => <Loading />,
  errorComponent: () => <Errored text="emmm...出错了呢..." />,
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
    AppStore.getState().db.on_update(update_user.name, async (e) => {
      if (e.table_name === "user") {
        await update_user();
      }
    });
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
    AppStore.getState().db.on_update(update_friends.name, async (e) => {
      if (e.table_name === "friend") {
        await update_friends();
      }
    });
    if (!(await AppStore.getState().endpoint.is_open())) {
      await AppStore.getState().endpoint.open(
        (
          await AppStore.getState().db.query<{ key: Uint8Array }>(
            QueryBuilder.selectFrom("user")
              .select("key")
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
      void handle_person_protocol_event();
    }
  },
  onLeave: () =>
    void (async () => {
      HomeStore.setState(() => {
        return { user: undefined, friends: new Map(), connections: new Map() };
      });
      await AppStore.getState().endpoint.close();
    })(),
  component: () => {
    const params = Route.useParams();
    const user = useStore(HomeStore, (state) => state.user);
    const friends = useStore(
      HomeStore,
      useShallow((state) => state.friends.values().toArray()),
    );
    const [search_user_result, set_search_user_result] = useState<
      Person & ID
    >();
    const [
      send_friend_request_button_disabled,
      set_send_friend_request_button_disabled,
    ] = useState(false);
    const [sidebar_type, set_sidebar_type] = useState<
      "message" | "friend" | "group"
    >("friend");
    const [sidebar_button_group, set_sidebar_button_group] = useState([
      {
        icon: <Mail className="size-6" />,
        selected: false,
        on_click: () => set_sidebar_type("message"),
      },
      {
        icon: <User className="size-6" />,
        selected: true,
        on_click: () => set_sidebar_type("friend"),
      },
      {
        icon: <Users className="size-6" />,
        selected: false,
        on_click: () => set_sidebar_type("group"),
      },
    ]);
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
    return (
      <div className="flex-1 flex min-h-0">
        {/*侧栏按钮*/}
        <div className="flex flex-col items-center pl-2 pr-2">
          <ButtonGroup orientation={"vertical"}>
            {sidebar_button_group.map((button, index) => (
              <Button
                variant={button.selected ? "secondary" : "outline"}
                size={"icon-lg"}
                onClick={() => {
                  button.on_click();
                  set_sidebar_button_group((v) =>
                    v.map((item, i) => ({
                      ...item,
                      selected: i === index,
                    })),
                  );
                }}
              >
                {button.icon}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        {/*侧栏面板*/}
        <div className="w-80 flex flex-col border-t border-r border-l rounded-tr-md rounded-tl-md min-h-0">
          {sidebar_type === "message" && (
            <div className="flex-1 flex justify-center items-center">
              <Label className="font-bold">TODO</Label>
            </div>
          )}
          {sidebar_type === "friend" && (
            <>
              {/* 好友面板 */}
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
                      <DialogDescription>
                        在下方的用户搜索栏通过对方的ID搜索你想添加为好友的用户
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...search_user_form}>
                      <FormField
                        control={search_user_form.control}
                        name="id"
                        render={({ field }) => (
                          <>
                            <FormItem>
                              <FormLabel>用户搜索</FormLabel>
                              <FormControl>
                                <ButtonGroup className="w-full">
                                  <Input
                                    {...field}
                                    placeholder="输入对方ID按回车搜索"
                                    disabled={
                                      search_user_form.formState.isSubmitting
                                    }
                                    onKeyDown={(e) =>
                                      void (async () => {
                                        if (e.key !== "Enter") return;
                                        e.preventDefault();
                                        await search_user_form.handleSubmit(
                                          async (form) => {
                                            if (
                                              (
                                                await AppStore.getState().db.query(
                                                  QueryBuilder.selectFrom(
                                                    "friend",
                                                  )
                                                    .select("id")
                                                    .where(
                                                      "user_id",
                                                      "=",
                                                      params.user_id,
                                                    )
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
                                      })()
                                    }
                                  />
                                  <Button
                                    variant={"outline"}
                                    onClick={() =>
                                      void navigator.clipboard.writeText(
                                        params.user_id,
                                      )
                                    }
                                  >
                                    点击复制你的ID
                                  </Button>
                                </ButtonGroup>
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
                                        !(await AppStore.getState().endpoint.request_friend(
                                          search_user_result.id,
                                        ))
                                      ) {
                                        throw Error("对方拒绝好友请求");
                                      }
                                    },
                                    {
                                      loading: "等待回应好友请求",
                                      error: (error: Error) => {
                                        set_send_friend_request_button_disabled(
                                          false,
                                        );
                                        return error.message;
                                      },
                                      success: () => {
                                        void (async () => {
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
                        to="/window/app/home/$user_id/chat/$friend_id"
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
            </>
          )}
          {sidebar_type === "group" && (
            <div className="flex-1 flex justify-center items-center">
              <Label className="font-bold">TODO</Label>
            </div>
          )}
          {/* 用户 */}
          <div className="p-2">
            <Item variant={"outline"}>
              <ItemMedia>
                <Avatar className="size-10" image={user?.avatar}>
                  {user?.name.at(0)}
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{user?.name}</ItemTitle>
                <ItemDescription>{user?.bio}</ItemDescription>
              </ItemContent>
            </Item>
          </div>
        </div>
        <Outlet />
      </div>
    );
  },
});

async function handle_person_protocol_event() {
  while (true) {
    const event =
      await AppStore.getState().endpoint.person_protocol_event_next();
    if (!event) break;
    if (event.kind === "FriendRequest") {
      void handle_friend_request_event(event.value);
    } else if (event.kind === "ChatRequest") {
      void handle_chat_request_event(event.value);
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
            onClick={() =>
              void (async () => {
                await AppStore.getState().db.execute(
                  QueryBuilder.insertInto("friend")
                    .values({
                      id: friend_id,
                      user_id: HomeStore.getState().user!.id,
                      ...friend_info,
                    })
                    .compile(),
                );
                await friend_request.accept();
                toast.dismiss(toast_id);
              })()
            }
          >
            <Check />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              void (async () => {
                await friend_request.reject();
                toast.dismiss(toast_id);
              })()
            }
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
          .select("id")
          .where("user_id", "=", HomeStore.getState().user!.id)
          .where("id", "=", friend_id)
          .limit(1)
          .compile(),
      )
    ).length === 0
  ) {
    await chat_request.reject();
  } else {
    const connection = await chat_request.accept();
    HomeStore.setState((v) => ({
      connections: v.connections.set(friend_id, connection),
    }));
    while (true) {
      const connection = HomeStore.getState().connections.get(friend_id);
      if (!connection) break;
      const message = await connection.recv();
      if (message === undefined) break;
      await AppStore.getState().db.execute(
        QueryBuilder.insertInto("message")
          .values({
            sender_id: friend_id,
            text: message,
          })
          .compile(),
      );
    }
    HomeStore.setState((v) => {
      v.connections.delete(friend_id);
      return {
        connections: v.connections,
      };
    });
  }
}
