import { useNavigate, type RouteSectionProps } from "@solidjs/router";
import { onMount } from "solid-js";

export default function Index(props: RouteSectionProps) {
  const navigate = useNavigate();
  onMount(() => navigate("/login"));
  return props.children;
}
