import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { blob_to_data_url } from "@/lib/blob_to_data_url";
import { AppPath } from "@/lib/file_system";
import { QueryBuilder } from "@/lib/query_builder";
import type {
  DOMPerson,
  FileMetadata,
  FriendMessage,
  ID,
  PersonData,
  PK,
  Text,
} from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConnectionType, type Connection } from "@starlink/endpoint";
import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Radio,
  RadioTower,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Waypoints,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Textarea from "react-textarea-autosize";
import z from "zod";

export const Route = createFileRoute("/app/home/$user_id/chat/$friend_id")({
  component: Component,
  pendingComponent: () => <Loading hint_text="正在初始化聊天栏" />,
  beforeLoad: async ({ context, params }) => {
    const friend_person_pk = (
      await context.db.query<PK>(
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
          .where("user_person.id", "=", params.user_id)
          .where("friend_person.id", "=", params.friend_id)
          .limit(1)
          .compile(),
      )
    )[0];
    if (!context.connections.get(params.friend_id)) {
      (async () => {
        const connection = await context.endpoint.request_chat(
          params.friend_id,
        );
        if (!connection) return;
        context.connections.set(params.friend_id, connection);
        while (true) {
          const connection = context.connections.get(params.friend_id);
          if (!connection) break;
          const message = await connection.read();
          if (!message) break;
          const message_pk = (
            await context.db.query<PK>(
              QueryBuilder.insertInto("message")
                .values({
                  text: message,
                })
                .returning("pk")
                .compile(),
            )
          )[0];
          await context.db.execute(
            QueryBuilder.insertInto("friend_message")
              .values({
                friend_person_pk: friend_person_pk.pk,
                message_pk: message_pk.pk,
              })
              .compile(),
          );
        }
        context.connections.delete(params.friend_id);
      })();
    }
    const person_data = (
      await context.db.query<{ key_file_pk: number } & PersonData>(
        QueryBuilder.selectFrom("person")
          .innerJoin("user", "user.person_pk", "person.pk")
          .select(["name", "avatar_file_pk", "bio"])
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
    return {
      friend: {
        pk: friend_person_pk.pk,
        name: person_data.name,
        avatar_url:
          avatar &&
          (await blob_to_data_url(new Blob([Uint8Array.from(avatar)]))),
        bio: person_data.bio,
      } satisfies DOMPerson & PK,
    };
  },
});
function Component() {
  const context = Route.useRouteContext();
  const params = Route.useParams();
  const [connection, set_connection] = useState<Connection | undefined>(
    context.connections.get(params.friend_id),
  );
  const [connection_type, set_connection_type] = useState<
    ConnectionType | undefined
  >(context.endpoint.connection_type(params.friend_id));
  const [connection_latency, set_connection_latency] = useState<
    number | undefined
  >(context.endpoint.latency(params.friend_id));
  const [messages, set_messages] = useState<FriendMessage[]>([]);
  //聊天消息列表;
  const message_list_ref = useRef(null);
  const message_virtualizer = useVirtualizer({
    getScrollElement: () => message_list_ref.current,
    count: messages.length,
    estimateSize: () => 60,
  });
  const message_items = message_virtualizer.getVirtualItems();
  //发送消息表单规则
  const send_message_form_schema = useMemo(
    () =>
      z.object({
        message: z.string().min(1),
      }),
    [],
  );
  //发送消息表单
  const send_message_form = useForm<z.infer<typeof send_message_form_schema>>({
    resolver: zodResolver(send_message_form_schema),
    defaultValues: {
      message: "",
    },
  });
  //监听连接状态变化
  useEffect(() => {
    context.connections.on_change(params.friend_id, (connection) => {
      set_connection(connection);
    });
    const update_connection_type_task = setInterval(
      () =>
        set_connection_type(context.endpoint.connection_type(params.friend_id)),
      1000,
    );
    const update_connection_latency_task = setInterval(
      () => set_connection_latency(context.endpoint.latency(params.friend_id)),
      1000,
    );
    return () => {
      clearInterval(update_connection_type_task);
      clearInterval(update_connection_latency_task);
    };
  }, []);
  //实时同步数据库好友消息
  useEffect(() => {
    const update = async () => {
      set_messages(
        await Promise.all(
          (
            await context.db.query<Text & ID>(
              QueryBuilder.selectFrom("message")
                .innerJoin(
                  "friend_message",
                  "friend_message.message_pk",
                  "message.pk",
                )
                .innerJoin(
                  "friend",
                  "friend.person_pk",
                  "friend_message.friend_person_pk",
                )
                .innerJoin("user", "user.person_pk", "friend.user_person_pk")
                .innerJoin("person", "person.pk", "user.person_pk")
                .innerJoin("person", "person.pk", "friend.person_pk")
                .select(["id", "text"])
                .where("id", "=", params.user_id)
                .where("id", "=", params.friend_id)
                .compile(),
            )
          ).map(async (v) => {
            return {
              is_sent: false,
              text: v.text,
            } satisfies FriendMessage;
          }),
        ),
      );
    };
    update();
    context.db.on_execute("friend_messages", update);
  }, []);
  //自动滚动到最新消息
  useEffect(() => {
    if (
      message_virtualizer.getVirtualIndexes().at(-1) ===
      messages.length - 1
    ) {
      message_virtualizer.scrollToIndex(Infinity);
    }
  }, [messages.length]);
  //每次渲染时自动获取聊天输入框焦点
  useEffect(() => send_message_form.setFocus("message"));
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center px-2 py-1 gap-1 border-b">
        <Avatar>
          <AvatarImage src={context.friend.avatar_url} />
          <AvatarFallback className="select-none">
            {context.friend.name.at(0)}
          </AvatarFallback>
        </Avatar>
        <Button variant={"link"} className="p-0 font-bold">
          {context.friend.name}
        </Button>
        <div className="flex gap-1">
          {!connection && <WifiOff className="size-5 text-red-700" />}
          {(() => {
            if (connection_type === ConnectionType.Direct) {
              return <Radio className="size-5 text-green-700" />;
            } else if (connection_type === ConnectionType.Relay) {
              return <RadioTower className="size-5 text-yellow-600" />;
            } else if (connection_type === ConnectionType.Mixed) {
              return <Waypoints className="size-5 text-blue-500" />;
            }
          })()}
          {connection_latency &&
            (() => {
              if (connection_latency < 100) {
                return <Signal className="size-5 text-green-700" />;
              } else if (connection_latency < 200) {
                return <SignalHigh className="size-5 text-yellow-600" />;
              } else if (connection_latency < 400) {
                return <SignalMedium className="size-5 text-red-700" />;
              } else if (connection_latency < 800) {
                return <SignalLow className="size-5 text-red-700" />;
              } else if (connection_latency < 1600) {
                return <SignalZero className="size-5 text-red-700" />;
              }
            })()}
        </div>
      </div>
      <div className="flex-1 flex flex-col p-2 min-h-0 gap-1">
        <div ref={message_list_ref} className="flex-1 overflow-y-auto">
          <div
            className="w-full relative"
            style={{ height: message_virtualizer.getTotalSize() }}
          >
            <div
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${message_items.at(0)?.start}px)`,
              }}
            >
              {messages &&
                message_items.map((value) => (
                  <div
                    ref={message_virtualizer.measureElement}
                    key={value.key}
                    data-index={value.index}
                    className="flex gap-1"
                  >
                    <Avatar className="size-10">
                      <AvatarImage
                        src={
                          (messages[value.index].is_sent &&
                            context.user.avatar_url) ||
                          (messages[value.index].is_sent &&
                            context.friend.avatar_url) ||
                          undefined
                        }
                      />
                      <AvatarFallback className="select-none">
                        {(messages[value.index].is_sent &&
                          context.user.name.at(0)) ||
                          (messages[value.index].is_sent &&
                            context.friend.name.at(0))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <Button
                        variant={"link"}
                        className="p-0 font-bold text-base"
                      >
                        {(messages[value.index].is_sent && context.user.name) ||
                          (messages[value.index].is_sent &&
                            context.friend.name)}
                      </Button>
                      <span>{messages[value.index].text}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <Form {...send_message_form}>
          <FormField
            control={send_message_form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    disabled={
                      send_message_form.formState.isSubmitting || !connection
                    }
                    maxRows={16}
                    className="resize-none border rounded p-2 focus:outline-none focus:border-neutral-200 focus:ring-1 focus:ring-neutral-200"
                    placeholder="发送消息"
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter" || e.shiftKey) return;
                      e.preventDefault();
                      await send_message_form.handleSubmit(async (form) => {
                        await connection!.send(form.message);
                        const message_pk = (
                          await context.db.query<PK>(
                            QueryBuilder.insertInto("message")
                              .values({
                                text: form.message,
                              })
                              .returning("pk")
                              .compile(),
                          )
                        )[0];
                        await context.db.execute(
                          QueryBuilder.insertInto("friend_message")
                            .values({
                              friend_person_pk: context.friend.pk,
                              message_pk: message_pk.pk,
                            })
                            .compile(),
                        );
                        send_message_form.reset();
                      })();
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </Form>
      </div>
    </div>
  );
}
