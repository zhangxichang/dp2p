import { env } from "bun";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  reporter: env.CI ? "github" : "html",
  webServer: {
    command: "bun run preview",
    url: "http://127.0.0.1:8787",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
});
