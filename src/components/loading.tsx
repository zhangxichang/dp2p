import clsx from "clsx";
import Loader from "./widgets/loader";

export function Loading(props: {
  hint_text: string;
  mode?: "screen" | "flex";
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center",
        props.mode === "screen" && "w-dvw h-dvh",
        props.mode === "flex" || (!props.mode && "flex-1"),
      )}
    >
      <Loader />
    </div>
  );
}
