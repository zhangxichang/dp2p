import "~/app.css";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Suspense } from "solid-js";
import { MenuBar } from "./components/ui/menu_bar";

export default function App() {
  return (
    <Router
      root={(props) => (
        <div class="absolute w-dvw h-dvh flex flex-col bg-base-200">
          <MenuBar />
          <ErrorBoundary fallback={<div>错误</div>}>
            <Suspense fallback={<div>加载中...</div>}>
              {props.children}
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
