import { defineConfig, devices } from "@playwright/test";

const e2ePort = 3300;
const baseURL = `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  workers: 1,
  use: {
    baseURL,
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
    command: `npm run dev -- --hostname localhost --port ${e2ePort}`,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
