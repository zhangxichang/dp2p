import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loading } from "@/components/loading";
import { toast } from "sonner";
import { QueryBuilder } from "@/lib/query_builder";
import { Errored } from "@/components/errored";
import { Endpoint } from "@/lib/endpoint";
import type { ID, Person } from "@/lib/types";
import { AppStore } from "../app";
import { Avatar } from "@/components/widgets/avatar";
import { UserIcon } from "lucide-react";
import type { SQLiteUpdateEvent } from "@/lib/sqlite";

export const Route = createFileRoute("/app/login")({
  component: Component,
  pendingComponent: () => <Loading hint_text="现在正在加载登录界面了" />,
  errorComponent: () => <Errored hint_text="唉呀~出错了好像" />,
});
function Component() {
  const navigate = useNavigate();
  const [users, set_users] = useState<(Person & ID)[]>([]);
  const [login_user_avatar, set_login_user_avatar] = useState<Uint8Array>();
  const register_avatar_input_ref = useRef<HTMLInputElement>(null);
  //登录表单规则
  const login_form_schema = useMemo(
    () =>
      z.object({
        id: z.string().min(1, "请选择一个账户"),
      }),
    [],
  );
  //注册表单规则
  const register_form_schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, "用户名不能为空"),
        avatar_file: z.file().optional(),
      }),
    [],
  );
  //登录表单
  const login_form = useForm<z.infer<typeof login_form_schema>>({
    resolver: zodResolver(login_form_schema),
    defaultValues: {
      id: "",
    },
  });
  //注册表单
  const register_form = useForm<z.infer<typeof register_form_schema>>({
    resolver: zodResolver(register_form_schema),
    defaultValues: {
      name: "",
    },
  });
  //实时同步用户列表
  useEffect(() => {
    const update = async () => {
      set_users(
        await AppStore.getState().db.query<Person & ID>(
          QueryBuilder.selectFrom("user")
            .select(["id", "name", "avatar", "bio"])
            .compile(),
        ),
      );
    };
    update();
    const on_update = async (e: SQLiteUpdateEvent) => {
      if (e.table_name === "user") {
        await update();
      }
    };
    AppStore.getState().db.on_update(on_update);
    AppStore.getState().on_resets.push(async () => {
      set_login_user_avatar(undefined);
      login_form.reset();
      await update();
    });
    return () => {
      AppStore.getState().db.unon_update(on_update);
      AppStore.setState((old) => ({
        on_resets: old.on_resets.filter((v) => v === update),
      }));
    };
  }, []);
  return (
    <div className="flex-1 flex items-center justify-center">
      <Tabs defaultValue="login">
        <TabsList>
          <TabsTrigger value="login">登录</TabsTrigger>
          <TabsTrigger value="register">注册</TabsTrigger>
        </TabsList>
        <Card className="w-82">
          <CardHeader>
            <CardTitle>
              <TabsContent value="login">登录你的账户</TabsContent>
              <TabsContent value="register">注册你的账户</TabsContent>
            </CardTitle>
            <CardDescription>
              <TabsContent value="login">选择一个账户登录</TabsContent>
              <TabsContent value="register">
                输入用户名注册一个新账户，你可以点击头像上传个性化头像
              </TabsContent>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 登录表单 */}
            <TabsContent value="login" asChild>
              <div className="flex flex-col gap-1">
                <div className="flex justify-center">
                  <Avatar className="size-14" image={login_user_avatar}>
                    <UserIcon />
                  </Avatar>
                </div>
                <Form {...login_form}>
                  <FormField
                    control={login_form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>账户</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            set_login_user_avatar(
                              users.find((v) => v.id === value)?.avatar,
                            );
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full py-5">
                              <SelectValue placeholder="选择账户" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>账户</SelectLabel>
                              {users.map((value) => (
                                <SelectItem key={value.id} value={value.id}>
                                  <Avatar image={value.avatar}>
                                    <UserIcon />
                                  </Avatar>
                                  <span>{value.name}</span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </div>
            </TabsContent>
            {/* 注册表单 */}
            <TabsContent value="register" asChild>
              <Form {...register_form}>
                <div className="flex flex-col gap-1">
                  <FormField
                    control={register_form.control}
                    name="avatar_file"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormControl>
                          <Avatar
                            className="size-14 cursor-pointer"
                            image={field.value}
                            onClick={() =>
                              register_avatar_input_ref.current?.click()
                            }
                          >
                            <UserIcon />
                          </Avatar>
                        </FormControl>
                        <FormMessage />
                        <input
                          ref={register_avatar_input_ref}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.item(0);
                            field.onChange(file);
                            if (!file) return;
                            if (!file.type.startsWith("image/")) {
                              register_form.setError("avatar_file", {
                                message: "请选择图片文件",
                              });
                            }
                          }}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={register_form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>用户名</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="输入用户名" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </TabsContent>
          </CardContent>
          <CardFooter>
            <TabsContent value="login" className="flex flex-col gap-1">
              <Button
                disabled={login_form.formState.isSubmitting}
                onClick={login_form.handleSubmit(async (form) => {
                  await navigate({
                    to: "/app/home/$user_id",
                    params: { user_id: form.id },
                  });
                })}
              >
                {login_form.formState.isSubmitting ? "登录中..." : "登录"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={"outline"}
                    onClick={(e) => {
                      if (
                        login_form.getValues("id") ===
                        login_form.formState.defaultValues?.id
                      ) {
                        login_form.setError("id", {
                          message: "请先选择一个账户删除",
                        });
                        e.preventDefault();
                      }
                    }}
                  >
                    删除账户
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      确定要删除选择的账户吗？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将会删除此账户的所有数据，且无法恢复，请谨慎操作！
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await AppStore.getState().db.execute(
                          QueryBuilder.deleteFrom("user")
                            .where("id", "=", login_form.getValues("id"))
                            .compile(),
                        );
                        set_login_user_avatar(undefined);
                        login_form.reset();
                      }}
                    >
                      确定
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>
            <TabsContent value="register" asChild>
              <Button
                disabled={register_form.formState.isSubmitting}
                onClick={register_form.handleSubmit(async (form) => {
                  if (
                    (
                      await AppStore.getState().db.query(
                        QueryBuilder.selectFrom("user")
                          .select("name")
                          .where("name", "=", form.name)
                          .limit(1)
                          .compile(),
                      )
                    ).length !== 0
                  ) {
                    register_form.setError("name", {
                      message: "用户名已经存在了",
                    });
                    return;
                  }
                  const secret_key = await Endpoint.generate_secret_key();
                  await AppStore.getState().db.execute(
                    QueryBuilder.insertInto("user")
                      .values({
                        id: await Endpoint.get_secret_key_id(secret_key),
                        key: secret_key,
                        name: form.name,
                        avatar:
                          form.avatar_file &&
                          new Uint8Array(await form.avatar_file.arrayBuffer()),
                      })
                      .compile(),
                  );
                  register_form.reset();
                  toast.success("账户注册成功");
                })}
              >
                注册
              </Button>
            </TabsContent>
          </CardFooter>
        </Card>
      </Tabs>
    </div>
  );
}
