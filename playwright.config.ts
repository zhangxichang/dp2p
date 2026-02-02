import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  reporter: "html",
  webServer: {
    command: "bun run preview",
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "safari",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
});
