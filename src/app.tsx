import "~/app.css";
import { Router, useIsRouting } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Show, Suspense } from "solid-js";
import Loading from "./components/widgets/loading";
import MenuBar from "./components/ui/menu_bar";
import Error from "./components/widgets/error";

export default function App() {
  return (
    <Router
      root={(props) => {
        const is_routing = useIsRouting();
        return (
          <div class="absolute w-dvw h-dvh flex flex-col bg-base-200">
            <MenuBar />
            <div class="flex-1 flex flex-col relative">
              <Show when={is_routing()}>
                <progress class="progress progress-primary absolute rounded-none h-0.5" />
              </Show>
              <ErrorBoundary
                fallback={(error) => <Error error={error as Error} />}
              >
                <Suspense fallback={<Loading />}>{props.children}</Suspense>
              </ErrorBoundary>
            </div>
          </div>
        );
      }}
    >
      <FileRoutes />
    </Router>
  );
}
