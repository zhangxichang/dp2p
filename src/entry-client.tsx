//@refresh reload
import { mount, StartClient } from "@solidjs/start/client";

export default function ClientEntry() {
  mount(() => <StartClient />, document.body);
}
