import clsx from "clsx";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function Loading(props: { hint_text: string, mode?: "screen" | "flex" }) {
    return (
        <div className={clsx(
            "flex items-center justify-center gap-1",
            props.mode === "screen" && "w-dvw h-dvh",
            props.mode === "flex" || !props.mode && "flex-1",
        )}>
            <Spinner className="size-6" />
            <Label className="font-bold">{props.hint_text}</Label>
        </div>
    )
}
