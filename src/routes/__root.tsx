import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: Component,
  head: () => ({
    meta: [{ title: "星链" }],
  }),
});
function Component() {
  return (
    <>
      <HeadContent />
      <Outlet />
    </>
  );
}
