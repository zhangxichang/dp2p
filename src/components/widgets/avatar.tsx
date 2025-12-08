import {
  Avatar as AvatarComponent,
  AvatarFallback,
  AvatarImage,
} from "@/shadcn/components/ui/avatar";
import { useEffect, useState, type ComponentPropsWithoutRef } from "react";

export function Avatar(
  props: ComponentPropsWithoutRef<typeof AvatarComponent> & {
    image?: Uint8Array | File | string | null;
  },
) {
  const [image_url, set_image_url] = useState<string>();
  useEffect(() => {
    let url: string | undefined;
    if (props.image instanceof Uint8Array || props.image instanceof Array) {
      url = URL.createObjectURL(new Blob([Uint8Array.from(props.image)]));
    } else if (props.image instanceof File) {
      url = URL.createObjectURL(props.image);
    } else if (typeof props.image === "string") {
      url = props.image;
    }
    set_image_url(url);
    if (url !== undefined) return () => URL.revokeObjectURL(url);
  }, [props.image]);
  return (
    <AvatarComponent {...props}>
      <AvatarImage src={image_url} />
      <AvatarFallback>{props.children}</AvatarFallback>
    </AvatarComponent>
  );
}
