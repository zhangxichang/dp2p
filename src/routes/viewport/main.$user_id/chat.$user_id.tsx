import { Loading } from "@/components/loading"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import Textarea from "react-textarea-autosize"
import { toast } from "sonner"
import z from "zod"

export const Route = createFileRoute("/viewport/main/$user_id/chat/$user_id")({
    component: Component,
    pendingComponent: () => <Loading hint_text="正在加载聊天栏" />,
    beforeLoad: async ({ }) => {
        return {}
    }
})
function Component() {
    //发送消息表单规则
    const send_message_form_schema = useMemo(() => z.object({
        message: z.string().min(1),
    }), [])
    //发送消息表单
    const send_message_form = useForm<z.infer<typeof send_message_form_schema>>({
        resolver: zodResolver(send_message_form_schema),
        defaultValues: {
            message: ""
        }
    })
    return (
        <div className="flex-1 flex flex-col">
            <div className="flex items-center p-2 gap-1 border-b border-t border-t-transparent">
                <Avatar>
                    <AvatarImage />
                    <AvatarFallback className="select-none">名</AvatarFallback>
                </Avatar>
                <Button variant={"link"} className="p-0 font-bold">名称</Button>
            </div>
            <div className="flex-1 flex flex-col p-1">
                <div className="flex-1 flex flex-col">
                    <div className="flex gap-1">
                        <Avatar className="size-10">
                            <AvatarImage />
                            <AvatarFallback className="select-none">名</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <Button variant={"link"} className="p-0 font-bold text-base">名称</Button>
                            <span>消息</span>
                        </div>
                    </div>
                </div>
                <Form {...send_message_form}>
                    <FormField
                        control={send_message_form.control}
                        name="message"
                        render={({ field, formState }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        disabled={formState.isSubmitting}
                                        maxRows={16}
                                        className="resize-none border rounded p-2 focus:outline-none focus:border-neutral-200 focus:ring-1 focus:ring-neutral-200"
                                        placeholder="发送消息"
                                        onKeyDown={async (e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault()
                                                await send_message_form.handleSubmit((form) => {
                                                    try {
                                                        toast.info(form.message)
                                                        send_message_form.reset()
                                                    } catch (error) { send_message_form.setError("message", { message: `${error}` }) }
                                                })()
                                            }
                                        }}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </Form>
            </div>
        </div>
    )
}
