import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { blob_to_data_url } from "@/lib/blob_to_data_url";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Connection, ConnectionType } from "@starlink/endpoint";
import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Textarea from "react-textarea-autosize";
import z from "zod";

export const Route = createFileRoute("/app/home/$user_id/chat/$friend_id")({
  component: Component,
  pendingComponent: () => <Loading hint_text="正在初始化聊天栏" />,
  beforeLoad: async ({ context, params }) => {
    if (!context.chat_connections.get(params.friend_id)) {
      (async () => {
        const connection = await context.endpoint.request_chat(
          params.friend_id,
        );
        if (!connection) return;
        context.chat_connections.set(params.friend_id, connection);
        while (true) {
          const connection = context.chat_connections.get(params.friend_id);
          if (!connection) break;
          const message = await connection.read();
          if (!message) break;
          await context.db.execute(
            `INSERT INTO chat_records(owner,sender,receiver,content)\
            VALUES('${params.user_id}','${params.friend_id}','${params.user_id}','${message}')`,
          );
        }
        context.chat_connections.delete(params.friend_id);
      })();
    }
  },
});
function Component() {
  const context = Route.useRouteContext();
  const params = Route.useParams();
  const [friend, set_friend] = useState<DOMUser[]>([]);
  const [connection, set_connection] = useState<Connection | undefined>(
    context.chat_connections.get(params.friend_id),
  );
  const [connection_type, set_connection_type] = useState<
    ConnectionType | undefined
  >(context.endpoint.connection_type(params.friend_id));
  const [connection_latency, set_connection_latency] = useState<
    number | undefined
  >(context.endpoint.latency(params.friend_id));
  const [chat_messages, set_chat_messages] = useState<ChatMessage[]>([]);
  //聊天消息列表;
  const chat_message_list_ref = useRef(null);
  const chat_message_virtualizer = useVirtualizer({
    getScrollElement: () => chat_message_list_ref.current,
    count: chat_messages.length,
    estimateSize: () => 60,
  });
  const chat_message_items = chat_message_virtualizer.getVirtualItems();
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
  //实时同步数据库好友信息
  useEffect(() => {
    context.db.live_query<DOMUser>(
      "friend",
      set_friend,
      `SELECT name,avatar,bio FROM friends WHERE id='${params.friend_id}' LIMIT 1`,
      {
        map: async (value) => ({
          id: value.id,
          name: value.name,
          avatar_url:
            value.avatar &&
            (await blob_to_data_url(new Blob([Uint8Array.from(value.avatar)]))),
          bio: value.bio,
        }),
      },
    );
  }, []);
  //监听连接状态变化
  useEffect(() => {
    context.chat_connections.on_change(params.friend_id, (connection) => {
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
  //实时同步数据库聊天记录
  useEffect(() => {
    context.db.live_query<ChatMessage>(
      "chat_messages",
      set_chat_messages,
      `SELECT sender,receiver,content FROM chat_records WHERE owner='${params.user_id}'`,
      {
        map: async (value) => ({
          sender: value.sender,
          receiver: value.name,
          content: value.content,
          timestamp: value.bio,
        }),
      },
    );
  }, []);
  //自动滚动到最新消息
  useEffect(() => {
    if (
      chat_message_virtualizer.getVirtualIndexes().at(-1) ===
      chat_messages.length - 1
    ) {
      chat_message_virtualizer.scrollToIndex(Infinity);
    }
  }, [chat_messages.length]);
  //每次渲染时自动获取聊天输入框焦点
  useEffect(() => send_message_form.setFocus("message"));
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center px-2 py-1 gap-1 border-b">
        <Avatar>
          <AvatarImage src={friend.at(0)?.avatar_url} />
          <AvatarFallback className="select-none">
            {friend.at(0)?.name.at(0)}
          </AvatarFallback>
        </Avatar>
        <Button variant={"link"} className="p-0 font-bold">
          {friend.at(0)?.name}
        </Button>
        <div className="flex gap-1">
          {/*{!connection && <WifiOff className="size-5 text-red-700" />}
          {connection_type &&
            connection_type !== "None" &&
            (() => {
              if (connection_type === "Direct") {
                return <Radio className="size-5 text-green-700" />;
              } else if (connection_type === "Relay") {
                return <RadioTower className="size-5 text-yellow-600" />;
              } else if (connection_type === "Mixed") {
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
            })()}*/}
        </div>
      </div>
      <div className="flex-1 flex flex-col p-2 min-h-0 gap-1">
        <div ref={chat_message_list_ref} className="flex-1 overflow-y-auto">
          <div
            className="w-full relative"
            style={{ height: chat_message_virtualizer.getTotalSize() }}
          >
            <div
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${chat_message_items.at(0)?.start}px)`,
              }}
            >
              {chat_messages &&
                chat_message_items.map((value) => (
                  <div
                    ref={chat_message_virtualizer.measureElement}
                    key={value.key}
                    data-index={value.index}
                    className="flex gap-1"
                  >
                    <Avatar className="size-10">
                      <AvatarImage
                        src={
                          (chat_messages[value.index].sender ===
                            params.user_id &&
                            context.user.avatar_url) ||
                          (chat_messages[value.index].sender ===
                            params.friend_id &&
                            context.friend.avatar_url) ||
                          undefined
                        }
                      />
                      <AvatarFallback className="select-none">
                        {(chat_messages[value.index].sender ===
                          params.user_id &&
                          context.user.name.at(0)) ||
                          (chat_messages[value.index].sender ===
                            params.friend_id &&
                            context.friend.name.at(0))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <Button
                        variant={"link"}
                        className="p-0 font-bold text-base"
                      >
                        {(chat_messages[value.index].sender ===
                          params.user_id &&
                          context.user.name) ||
                          (chat_messages[value.index].sender ===
                            params.friend_id &&
                            context.friend.name)}
                      </Button>
                      <span>{chat_messages[value.index].message}</span>
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
                        const chat_record_id = (
                          await context.db.query<number>(
                            `INSERT OR IGNORE INTO chat_records(message) VALUES('${form.message}') RETURNING chat_record_id`,
                          )
                        )[0];
                        await context.db.execute(
                          `INSERT OR IGNORE INTO chat_record_index(user_id,chat_id,chat_record_id) \
                          VALUES('${params.user_id}','${params.friend_id}',${chat_record_id})`,
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
