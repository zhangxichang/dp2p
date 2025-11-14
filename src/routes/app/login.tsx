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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon } from "lucide-react";
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
import { blob_to_data_url } from "@/lib/blob_to_data_url";
import { toast } from "sonner";
import { QueryBuilder } from "@/lib/query_builder";
import { Errored } from "@/components/errored";
import { Endpoint } from "@/lib/endpoint";
import type { DOMPerson, FileMetadata, ID, PersonData, PK } from "@/lib/types";
import xxhash from "xxhash-wasm";

export const Route = createFileRoute("/app/login")({
  component: Component,
  pendingComponent: () => <Loading hint_text="现在正在加载登录界面了" />,
  errorComponent: () => <Errored hint_text="唉呀~出错了好像" />,
});
function Component() {
  const context = Route.useRouteContext();
  const navigate = useNavigate();
  const register_avatar_input_ref = useRef<HTMLInputElement>(null);
  const [users, set_users] = useState<(DOMPerson & PK)[]>([]);
  //登录表单规则
  const login_form_schema = useMemo(
    () =>
      z.object({
        person_pk: z.string().min(1, "请选择一个账户"),
        avatar_url: z.string().optional().nullable(),
      }),
    [],
  );
  //注册表单规则
  const register_form_schema = useMemo(
    () =>
      z.object({
        user_name: z.string().min(1, "用户名不能为空"),
        avatar_url: z.string().optional().nullable(),
      }),
    [],
  );
  //登录表单
  const login_form = useForm<z.infer<typeof login_form_schema>>({
    resolver: zodResolver(login_form_schema),
    defaultValues: {
      person_pk: "",
    },
  });
  //注册表单
  const register_form = useForm<z.infer<typeof register_form_schema>>({
    resolver: zodResolver(register_form_schema),
    defaultValues: {
      user_name: "",
    },
  });
  //实时同步数据库用户变化
  useEffect(() => {
    const update_users = async () => {
      set_users(
        await Promise.all(
          (
            await context.db.query<PersonData & PK>(
              QueryBuilder.selectFrom("person")
                .innerJoin("user", "user.person_pk", "person.pk")
                .select([
                  "person.pk",
                  "person.name",
                  "person.avatar_file_pk",
                  "person.bio",
                ])
                .compile(),
            )
          ).map(async (v) => {
            let avatar_url: string | undefined;
            if (v.avatar_file_pk) {
              avatar_url = await blob_to_data_url(
                new Blob([
                  Uint8Array.from(
                    await context.fs.read_file(
                      `data/${
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
              pk: v.pk,
              name: v.name,
              avatar_url,
              bio: v.bio,
            } satisfies DOMPerson & PK;
          }),
        ),
      );
    };
    update_users();
    context.db.on_execute("login_users", update_users);
    context.db.on_open("login_users", () => {
      login_form.reset();
      update_users();
    });
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
              <Form {...login_form}>
                <div className="flex flex-col gap-1">
                  <FormField
                    control={login_form.control}
                    name="avatar_url"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormControl>
                          <Avatar className="size-14">
                            <AvatarImage src={field.value ?? undefined} />
                            <AvatarFallback>
                              <UserIcon />
                            </AvatarFallback>
                          </Avatar>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={login_form.control}
                    name="person_pk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>账户</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            login_form.setValue(
                              "avatar_url",
                              users.find((v) => v.pk.toString() === value)
                                ?.avatar_url,
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
                                <SelectItem
                                  key={value.pk}
                                  value={value.pk.toString()}
                                >
                                  <Avatar>
                                    <AvatarImage src={value.avatar_url} />
                                    <AvatarFallback>
                                      {value.name.at(0)}
                                    </AvatarFallback>
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
                </div>
              </Form>
            </TabsContent>
            {/* 注册表单 */}
            <TabsContent value="register" asChild>
              <Form {...register_form}>
                <div className="flex flex-col gap-1">
                  <FormField
                    control={register_form.control}
                    name="avatar_url"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormControl>
                          <Avatar
                            className="size-14 cursor-pointer"
                            onClick={() =>
                              register_avatar_input_ref.current?.click()
                            }
                          >
                            <AvatarImage src={field.value ?? undefined} />
                            <AvatarFallback>
                              <UserIcon />
                            </AvatarFallback>
                          </Avatar>
                        </FormControl>
                        <FormMessage />
                        <input
                          ref={register_avatar_input_ref}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={async (e) => {
                            const file = e.target.files?.item(0);
                            if (!file) return;
                            if (!file.type.startsWith("image/")) {
                              register_form.setError("avatar_url", {
                                message: "请选择一个图片文件",
                              });
                              return;
                            }
                            register_form.clearErrors("avatar_url");
                            field.onChange(await blob_to_data_url(file));
                          }}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={register_form.control}
                    name="user_name"
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
                  const row = (
                    await context.db.query<ID>(
                      QueryBuilder.selectFrom("person")
                        .select(["id"])
                        .where("pk", "=", Number(form.person_pk))
                        .limit(1)
                        .compile(),
                    )
                  )[0];
                  await navigate({
                    to: "/app/home/$user_id",
                    params: { user_id: row.id },
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
                        login_form.getValues("person_pk") ===
                        login_form.formState.defaultValues?.person_pk
                      ) {
                        login_form.setError("person_pk", {
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
                        await context.db.execute(
                          QueryBuilder.deleteFrom("user")
                            .where(
                              "person_pk",
                              "=",
                              Number(login_form.getValues("person_pk")),
                            )
                            .compile(),
                        );
                        await context.db.execute(
                          QueryBuilder.deleteFrom("person")
                            .where(
                              "pk",
                              "=",
                              Number(login_form.getValues("person_pk")),
                            )
                            .compile(),
                        );
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
                      await context.db.query(
                        QueryBuilder.selectFrom("person")
                          .innerJoin("user", "user.person_pk", "person.pk")
                          .select("person.pk")
                          .where("name", "=", form.user_name)
                          .limit(1)
                          .compile(),
                      )
                    ).length !== 0
                  ) {
                    register_form.setError("user_name", {
                      message: "用户名已经存在了",
                    });
                    return;
                  }
                  let avatar =
                    form.avatar_url &&
                    (await (await fetch(form.avatar_url)).bytes());
                  let avatar_file_pk: PK | undefined;
                  if (avatar) {
                    const avatar_hash = (await xxhash())
                      .h64Raw(avatar)
                      .toString(16);
                    if (!(await context.fs.exists(`data/${avatar_hash}`))) {
                      await context.fs.create_file(
                        `data/${avatar_hash}`,
                        avatar,
                      );
                    }
                    const file_pk = (
                      await context.db.query<PK>(
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
                  const secret_key = await Endpoint.generate_secret_key();
                  const person_pk = (
                    await context.db.query<PK>(
                      QueryBuilder.insertInto("person")
                        .values({
                          id: await Endpoint.get_secret_key_id(secret_key),
                          name: form.user_name,
                          avatar_file_pk: avatar_file_pk?.pk,
                        })
                        .returning("pk")
                        .compile(),
                    )
                  )[0];
                  const key_hash = (await xxhash())
                    .h64Raw(secret_key)
                    .toString(16);
                  if (!(await context.fs.exists(`data/${key_hash}`))) {
                    await context.fs.create_file(
                      `data/${key_hash}`,
                      secret_key,
                    );
                  }
                  const key_file_pk = (
                    await context.db.query<PK>(
                      QueryBuilder.insertInto("file")
                        .values({
                          hash: key_hash,
                        })
                        .returning("pk")
                        .compile(),
                    )
                  )[0];
                  await context.db.execute(
                    QueryBuilder.insertInto("user")
                      .values({
                        person_pk: person_pk.pk,
                        key_file_pk: key_file_pk.pk,
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
