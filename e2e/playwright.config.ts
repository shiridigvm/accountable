import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// The end-to-end run starts both servers itself, on a separate database and a fixed date,
// so it never touches the development data.
const root = path.resolve(import.meta.dirname, "..");
const testDb = path.join(import.meta.dirname, ".data", "test.db");
const env = {
  ...process.env,
  ACCOUNTABLE_DB: testDb,
  ACCOUNTABLE_TODAY: "2026-11-17",
  ACCOUNTABLE_ALLOW_RESET: "1",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The HTML report is written to e2e/playwright-report, for looking into a failed local run.
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command:
        "uv run -m uvicorn accountable.main:app --host 127.0.0.1 --port 8000",
      cwd: root,
      url: "http://127.0.0.1:8000/api/pipeline",
      reuseExistingServer: false,
      env,
      timeout: 120_000,
    },
    {
      command: "npm run dev -w frontend",
      cwd: root,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      env,
      timeout: 120_000,
    },
  ],
});
