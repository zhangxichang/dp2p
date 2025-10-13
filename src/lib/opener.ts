import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

export function open_url(url: string) {
    if (isTauri()) {
        openUrl(url)
    } else {
        open(url)
    }
}
