let tauri_opener: typeof import("@tauri-apps/plugin-opener") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM) {
  tauri_opener = await import("@tauri-apps/plugin-opener");
}

export async function open_url(url: string) {
  if (tauri_opener) {
    await tauri_opener.openUrl(url);
  } else {
    open(url);
  }
}
