import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { blob_to_data_url } from "@/lib/blob_to_data_url";
import { createStore } from "zustand";
import { combine } from "zustand/middleware";
import { Link } from "@tanstack/react-router";
import type { DOMPerson, FileMetadata, ID, PersonData, PK } from "@/lib/types";
import { Connections } from "@/lib/connections";
import { QueryBuilder } from "@/lib/query_builder";
import type { Endpoint } from "@/lib/endpoint";
import type { Sqlite } from "@/lib/sqlite";
import { AppPath, FileSystem } from "@/lib/file_system";

const Store = createStore(
  combine(
    {
      connections: new Connections(),
    },
    (set, get) => ({ set, get }),
  ),
);
export const Route = createFileRoute("/app/home/$user_id")({
  component: Component,
  pendingComponent: () => <Loading hint_text="正在初始化主界面" />,
  beforeLoad: async ({ context, params }) => {
    const store = Store.getState();
    const person_data = (
      await context.db.query<{ key_file_pk: number } & PersonData & PK>(
        QueryBuilder.selectFrom("person")
          .innerJoin("user", "user.person_pk", "person.pk")
          .select(["key_file_pk", "pk", "name", "avatar_file_pk", "bio"])
          .where("id", "=", params.user_id)
          .limit(1)
          .compile(),
      )
    )[0];
    let avatar: Uint8Array | undefined;
    if (person_data.avatar_file_pk) {
      avatar = await context.fs.read_file(
        `${AppPath.DataDirectory}/${
          (
            await context.db.query<FileMetadata>(
              QueryBuilder.selectFrom("file")
                .select(["hash"])
                .where("pk", "=", person_data.avatar_file_pk)
                .limit(1)
                .compile(),
            )
          )[0].hash
        }`,
      );
    }
    if (!(await context.endpoint.is_create())) {
      await context.endpoint.create(
        await context.fs.read_file(
          `${AppPath.DataDirectory}/${
            (
              await context.db.query<FileMetadata>(
                QueryBuilder.selectFrom("file")
                  .select(["hash"])
                  .where("pk", "=", person_data.key_file_pk)
                  .limit(1)
                  .compile(),
              )
            )[0].hash
          }`,
        ),
        {
          name: person_data.name,
          avatar,
          bio: person_data.bio,
        },
      );
      handle_friend_request(
        context.fs,
        context.db,
        context.endpoint,
        params.user_id,
      );
      handle_chat_request(
        context.db,
        context.endpoint,
        params.user_id,
        store.get().connections,
      );
    }
    return {
      user: {
        pk: person_data.pk,
        name: person_data.name,
        avatar_url:
          avatar &&
          (await blob_to_data_url(new Blob([Uint8Array.from(avatar)]))),
        bio: person_data.bio,
      } satisfies DOMPerson & PK,
      connections: store.get().connections,
    };
  },
});
function Component() {
  const context = Route.useRouteContext();
  const params = Route.useParams();
  const [friends, set_friends] = useState<(DOMPerson & ID)[]>([]);
  const [search_user_result, set_search_user_result] = useState<
    DOMPerson & ID
  >();
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
  //实时同步数据库好友
  useEffect(() => {
    const update = async () => {
      set_friends(
        await Promise.all(
          (
            await context.db.query<PersonData & ID>(
              QueryBuilder.selectFrom("user")
                .innerJoin("friend", "friend.user_person_pk", "user.person_pk")
                .innerJoin(
                  "person as user_person",
                  "user_person.pk",
                  "user.person_pk",
                )
                .innerJoin(
                  "person as friend_person",
                  "friend_person.pk",
                  "friend.person_pk",
                )
                .select([
                  "friend_person.id",
                  "friend_person.name",
                  "friend_person.avatar_file_pk",
                  "friend_person.bio",
                ])
                .where("user_person.id", "=", params.user_id)
                .compile(),
            )
          ).map(async (v) => {
            let avatar_url: string | undefined;
            if (v.avatar_file_pk) {
              avatar_url = await blob_to_data_url(
                new Blob([
                  Uint8Array.from(
                    await context.fs.read_file(
                      `${AppPath.DataDirectory}/${
                        (
                          await context.db.query<FileMetadata>(
                            QueryBuilder.selectFrom("file")
                              .where("pk", "=", v.avatar_file_pk)
                              .select(["hash"])
                              .limit(1)
                              .compile(),
                          )
                        )[0].hash
                      }`,
                    ),
                  ),
                ]),
              );
            }
            return {
              id: v.id,
              name: v.name,
              avatar_url,
              bio: v.bio,
            } satisfies DOMPerson & ID;
          }),
        ),
      );
    };
    update();
    context.db.on_execute("friends", update);
  }, []);
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
                                  if (
                                    (
                                      await context.db.query(
                                        QueryBuilder.selectFrom("user")
                                          .innerJoin(
                                            "person as user_person",
                                            "user_person.pk",
                                            "user.person_pk",
                                          )
                                          .innerJoin(
                                            "friend",
                                            "friend.user_person_pk",
                                            "user.person_pk",
                                          )
                                          .innerJoin(
                                            "person as friend_person",
                                            "friend_person.pk",
                                            "friend.person_pk",
                                          )
                                          .select(["friend_person.pk"])
                                          .where(
                                            "user_person.id",
                                            "=",
                                            params.user_id,
                                          )
                                          .where(
                                            "friend_person.id",
                                            "=",
                                            form.user_id,
                                          )
                                          .limit(1)
                                          .compile(),
                                      )
                                    ).length !== 0
                                  ) {
                                    search_user_form.setError("user_id", {
                                      message: "已经是你的好友了",
                                    });
                                  }
                                  const person =
                                    await context.endpoint.request_person(
                                      form.user_id,
                                    );
                                  set_search_user_result({
                                    id: form.user_id,
                                    name: person.name,
                                    avatar_url:
                                      person.avatar &&
                                      (await blob_to_data_url(
                                        new Blob([
                                          Uint8Array.from(person.avatar),
                                        ]),
                                      )),
                                    bio: person.bio,
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
                    <Avatar>
                      <AvatarImage src={search_user_result.avatar_url} />
                      <AvatarFallback>
                        {search_user_result.name.at(0)}
                      </AvatarFallback>
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
                                  !(await context.endpoint.request_friend(
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
                                    let avatar_file_pk: PK | undefined;
                                    if (search_user_result.avatar_url) {
                                      let avatar = await (
                                        await fetch(
                                          search_user_result.avatar_url,
                                        )
                                      ).bytes();
                                      const avatar_hash = Array.from(
                                        new Uint8Array(
                                          await crypto.subtle.digest(
                                            "SHA-256",
                                            avatar,
                                          ),
                                        ),
                                      )
                                        .map((byte) =>
                                          byte.toString(16).padStart(2, "0"),
                                        )
                                        .join("");
                                      if (
                                        !(await context.fs.exists(
                                          `${AppPath.DataDirectory}/${avatar_hash}`,
                                        ))
                                      ) {
                                        await context.fs.create_file(
                                          `${AppPath.DataDirectory}/${avatar_hash}`,
                                          avatar,
                                        );
                                      }
                                      const file_pk = (
                                        await context.db.query<PK>(
                                          QueryBuilder.insertInto("file")
                                            .values({
                                              hash: avatar_hash,
                                            })
                                            .onConflict((oc) =>
                                              oc.column("hash").doNothing(),
                                            )
                                            .returning("pk")
                                            .compile(),
                                        )
                                      ).at(0);
                                      if (file_pk) {
                                        avatar_file_pk = file_pk;
                                      } else {
                                        avatar_file_pk = (
                                          await context.db.query<PK>(
                                            QueryBuilder.selectFrom("file")
                                              .select(["pk"])
                                              .where("hash", "=", avatar_hash)
                                              .limit(1)
                                              .compile(),
                                          )
                                        )[0];
                                      }
                                    }
                                    const person_pk = (
                                      await context.db.query<PK>(
                                        QueryBuilder.insertInto("person")
                                          .values({
                                            id: search_user_result.id,
                                            name: search_user_result.name,
                                            avatar_file_pk: avatar_file_pk?.pk,
                                          })
                                          .returning("pk")
                                          .compile(),
                                      )
                                    )[0];
                                    const user_person_pk = (
                                      await context.db.query<PK>(
                                        QueryBuilder.selectFrom("user")
                                          .innerJoin(
                                            "person",
                                            "person.pk",
                                            "person_pk",
                                          )
                                          .select(["person_pk"])
                                          .where(
                                            "person.id",
                                            "=",
                                            params.user_id,
                                          )
                                          .limit(1)
                                          .compile(),
                                      )
                                    )[0];
                                    await context.db.execute(
                                      QueryBuilder.insertInto("friend")
                                        .values({
                                          person_pk: person_pk.pk,
                                          user_person_pk: user_person_pk.pk,
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
  fs: FileSystem,
  db: Sqlite,
  endpoint: Endpoint,
  user_id: string,
) {
  while (true) {
    const friend_request = await endpoint.friend_request_next();
    if (!friend_request) break;
    (async () => {
      const friend_info = await endpoint.request_person(
        friend_request.remote_id(),
      );
      const friend_avatar_url =
        friend_info.avatar &&
        (await blob_to_data_url(
          new Blob([Uint8Array.from(friend_info.avatar)]),
        ));
      const toast_id = toast(
        <div className="flex-1">
          <Label className="font-bold">好友请求</Label>
          <Item>
            <ItemMedia>
              <Avatar>
                <AvatarImage src={friend_avatar_url} />
                <AvatarFallback>{friend_info.name.at(0)}</AvatarFallback>
              </Avatar>
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
                  const friend_id = friend_request.remote_id();
                  let avatar_file_pk: PK | undefined;
                  if (friend_info.avatar) {
                    const avatar_hash = Array.from(
                      new Uint8Array(
                        await crypto.subtle.digest(
                          "SHA-256",
                          Uint8Array.from(friend_info.avatar),
                        ),
                      ),
                    )
                      .map((byte) => byte.toString(16).padStart(2, "0"))
                      .join("");
                    if (
                      !(await fs.exists(
                        `${AppPath.DataDirectory}/${avatar_hash}`,
                      ))
                    ) {
                      await fs.create_file(
                        `${AppPath.DataDirectory}/${avatar_hash}`,
                        friend_info.avatar,
                      );
                    }
                    const file_pk = (
                      await db.query<PK>(
                        QueryBuilder.insertInto("file")
                          .values({
                            hash: avatar_hash,
                          })
                          .onConflict((oc) => oc.column("hash").doNothing())
                          .returning("pk")
                          .compile(),
                      )
                    ).at(0);
                    if (file_pk) {
                      avatar_file_pk = file_pk;
                    } else {
                      avatar_file_pk = (
                        await db.query<PK>(
                          QueryBuilder.selectFrom("file")
                            .select(["pk"])
                            .where("hash", "=", avatar_hash)
                            .limit(1)
                            .compile(),
                        )
                      )[0];
                    }
                  }
                  const person_pk = (
                    await db.query<PK>(
                      QueryBuilder.insertInto("person")
                        .values({
                          id: friend_id,
                          name: friend_info.name,
                          avatar_file_pk: avatar_file_pk?.pk,
                        })
                        .returning("pk")
                        .compile(),
                    )
                  )[0];
                  const user_person_pk = (
                    await db.query<PK>(
                      QueryBuilder.selectFrom("user")
                        .innerJoin("person", "person.pk", "person_pk")
                        .select(["person_pk"])
                        .where("person.id", "=", user_id)
                        .limit(1)
                        .compile(),
                    )
                  )[0];
                  await db.execute(
                    QueryBuilder.insertInto("friend")
                      .values({
                        person_pk: person_pk.pk,
                        user_person_pk: user_person_pk.pk,
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
    })();
  }
}

async function handle_chat_request(
  db: Sqlite,
  endpoint: Endpoint,
  user_id: string,
  connections: Connections,
) {
  while (true) {
    const chat_request = await endpoint.chat_request_next();
    if (!chat_request) break;
    (async () => {
      const friend_id = chat_request.remote_id();
      const friend_person_pk = (
        await db.query<PK>(
          QueryBuilder.selectFrom("user")
            .innerJoin(
              "person as user_person",
              "user_person.pk",
              "user.person_pk",
            )
            .innerJoin("friend", "friend.user_person_pk", "user.person_pk")
            .innerJoin(
              "person as friend_person",
              "friend_person.pk",
              "friend.person_pk",
            )
            .select(["friend_person.pk"])
            .where("user_person.id", "=", user_id)
            .where("friend_person.id", "=", friend_id)
            .limit(1)
            .compile(),
        )
      ).at(0);
      if (!friend_person_pk) {
        chat_request.reject();
      } else {
        const connection = chat_request.accept();
        connections.set(friend_id, connection);
        while (true) {
          const connection = connections.get(friend_id);
          if (!connection) break;
          const message = await connection.read();
          if (!message) break;
          const message_pk = (
            await db.query<PK>(
              QueryBuilder.insertInto("message")
                .values({
                  text: message,
                })
                .returning("pk")
                .compile(),
            )
          )[0];
          await db.execute(
            QueryBuilder.insertInto("friend_message")
              .values({
                friend_person_pk: friend_person_pk.pk,
                message_pk: message_pk.pk,
              })
              .compile(),
          );
        }
        connections.delete(friend_id);
      }
    })();
  }
}
