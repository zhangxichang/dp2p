import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  reporter: process.env.CI ? "dot" : "html",
  webServer: {
    command: "bun run preview",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: !process.env.CI,
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
  ],
});
