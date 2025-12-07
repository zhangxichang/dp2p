import { Loading } from "@/components/loading";
import { Button } from "@/shadcn/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/shadcn/components/ui/form";
import { QueryBuilder } from "@/lib/query_builder";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { HomeStore } from "../home.$user_id";
import type { Message } from "@/lib/types";
import { Avatar } from "@/components/widgets/avatar";
import { useStore } from "zustand";
import type { ConnectionType } from "@/lib/endpoint";
import { AppStore } from "../../app";
import { Errored } from "@/components/errored";

export const Route = createFileRoute(
  "/window/app/home/$user_id/chat/$friend_id",
)({
  pendingComponent: () => <Loading />,
  errorComponent: () => <Errored text="聊天界面好像出了点问题" />,
  beforeLoad: ({ params }) => {
    if (!HomeStore.getState().connections.get(params.friend_id)) {
      void (async () => {
        const connection = await AppStore.getState().endpoint.request_chat(
          params.friend_id,
        );
        if (!connection) return;
        HomeStore.setState((v) => ({
          connections: v.connections.set(params.friend_id, connection),
        }));
        while (true) {
          const connection = HomeStore.getState().connections.get(
            params.friend_id,
          );
          if (!connection) break;
          const message = await connection.recv();
          if (message === undefined) break;
          await AppStore.getState().db.execute(
            QueryBuilder.insertInto("message")
              .values({
                sender_id: params.friend_id,
                text: message,
              })
              .compile(),
          );
        }
        HomeStore.setState((v) => {
          v.connections.delete(params.friend_id);
          return {
            connections: v.connections,
          };
        });
      })();
    }
  },
  component: () => {
    const params = Route.useParams();
    const user = useStore(HomeStore, (state) => state.user);
    const friend = useStore(HomeStore, (state) =>
      state.friends.get(params.friend_id),
    );
    const connection = useStore(HomeStore, (state) =>
      state.connections.get(params.friend_id),
    );
    const [connection_type, set_connection_type] = useState<ConnectionType>();
    const [connection_latency, set_connection_latency] = useState<number>();
    const [messages, set_messages] = useState<Message[]>([]);
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
    const send_message_form = useForm<z.infer<typeof send_message_form_schema>>(
      {
        resolver: zodResolver(send_message_form_schema),
        defaultValues: {
          message: "",
        },
      },
    );
    //监听连接状态变化
    useEffect(() => {
      const update_connection_type_task = setInterval(
        () =>
          void (async () =>
            set_connection_type(
              await AppStore.getState().endpoint.conn_type(params.friend_id),
            ))(),
        1000,
      );
      const update_connection_latency_task = setInterval(
        () =>
          void (async () =>
            set_connection_latency(
              await AppStore.getState().endpoint.latency(params.friend_id),
            ))(),
        1000,
      );
      return () => {
        clearInterval(update_connection_type_task);
        clearInterval(update_connection_latency_task);
      };
    }, []);
    //实时同步消息
    useEffect(() => {
      const update_messages = async () => {
        set_messages(
          await AppStore.getState().db.query<Message>(
            QueryBuilder.selectFrom("message")
              .select(["sender_id", "text"])
              .where("sender_id", "in", [params.user_id, params.friend_id])
              .compile(),
          ),
        );
      };
      void update_messages();
      AppStore.getState().db.on_update(update_messages.name, async (e) => {
        if (e.table_name === "message") {
          await update_messages();
        }
      });
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
          <Avatar image={friend?.avatar}>{friend?.name.at(0)}</Avatar>
          <Button variant={"link"} className="p-0 font-bold">
            {friend?.name}
          </Button>
          <div className="flex gap-1">
            {!connection && <WifiOff className="size-5 text-red-700" />}
            {(() => {
              if (connection_type === "Direct") {
                return <Radio className="size-5 text-green-700" />;
              } else if (connection_type === "Relay") {
                return <RadioTower className="size-5 text-yellow-600" />;
              } else if (connection_type === "Mixed") {
                return <Waypoints className="size-5 text-blue-500" />;
              }
            })()}
            {connection_latency !== undefined &&
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
                {message_items.map((value) => (
                  <div
                    ref={message_virtualizer.measureElement}
                    key={value.key}
                    data-index={value.index}
                    className="flex gap-1"
                  >
                    <Avatar
                      className="size-10"
                      image={
                        messages[value.index].sender_id === params.user_id
                          ? user?.avatar
                          : messages[value.index].sender_id === params.friend_id
                            ? friend?.avatar
                            : null
                      }
                    >
                      {messages[value.index].sender_id === params.user_id
                        ? user?.name.at(0)
                        : messages[value.index].sender_id === params.friend_id
                          ? friend?.name.at(0)
                          : null}
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <Button
                        variant={"link"}
                        className="p-0 font-bold text-base"
                      >
                        {messages[value.index].sender_id === params.user_id
                          ? user?.name
                          : messages[value.index].sender_id === params.friend_id
                            ? friend?.name
                            : null}
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
                      onKeyDown={(e) =>
                        void (async () => {
                          if (e.key !== "Enter" || e.shiftKey) return;
                          e.preventDefault();
                          await send_message_form.handleSubmit(async (form) => {
                            await connection!.send(form.message);
                            await AppStore.getState().db.execute(
                              QueryBuilder.insertInto("message")
                                .values({
                                  sender_id: params.user_id,
                                  text: form.message,
                                })
                                .compile(),
                            );
                            send_message_form.reset();
                          })();
                        })()
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        </div>
      </div>
    );
  },
});
