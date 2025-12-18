import {
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";

export function Image(
  props: {
    image?: Uint8Array | Array<number> | File | string | null;
  } & JSX.ImgHTMLAttributes<HTMLImageElement>,
) {
  const [split_props, other_props] = splitProps(props, ["image", "src"]);
  const [image_url, set_image_url] = createSignal<string>();
  onMount(() => {
    if (
      split_props.image instanceof Uint8Array ||
      split_props.image instanceof Array
    ) {
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(split_props.image)]),
      );
      onCleanup(() => URL.revokeObjectURL(url));
      set_image_url(url);
    } else if (split_props.image instanceof File) {
      const url = URL.createObjectURL(split_props.image);
      onCleanup(() => URL.revokeObjectURL(url));
      set_image_url(url);
    } else if (typeof split_props.image === "string") {
      set_image_url(split_props.image);
    } else {
      set_image_url();
    }
  });
  return <img {...other_props} src={image_url()} />;
}
