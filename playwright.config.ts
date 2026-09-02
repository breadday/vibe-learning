import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname localhost --port 3100",
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
    },
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
