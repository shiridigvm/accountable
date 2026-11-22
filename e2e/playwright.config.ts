import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// The end-to-end run starts both servers itself, on a separate database and a fixed date,
// so it never touches the development data.
const root = path.resolve(import.meta.dirname, "..");
const testDb = path.join(import.meta.dirname, ".data", "test.db");
// Never Supabase or Postgres, whatever the shell holds: the tests sign in with test
// sign-in and keep their own SQLite file. (.env is not read here at all.)
// Never the real OpenRouter either: the backend talks to e2e/fake-openrouter.mjs
// with a fake key, and any real key or model in the shell is left out.
const FAKE_OPENROUTER_PORT = 8100;
const LEFT_OUT = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "OPENROUTER_MODEL",
];
const env = Object.fromEntries(
  Object.entries({
    ...process.env,
    ACCOUNTABLE_DB: testDb,
    ACCOUNTABLE_TODAY: "2026-11-17",
    ACCOUNTABLE_ALLOW_RESET: "1",
    ACCOUNTABLE_TEST_SIGN_IN: "1",
    OPENROUTER_API_KEY: "e2e-fake-key",
    OPENROUTER_BASE_URL: `http://127.0.0.1:${FAKE_OPENROUTER_PORT}/api/v1`,
  }).filter(
    (entry): entry is [string, string] =>
      entry[1] !== undefined && !LEFT_OUT.includes(entry[0]),
  ),
);

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
      url: "http://127.0.0.1:8000/api/auth/config",
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
    {
      command: `node e2e/fake-openrouter.mjs ${FAKE_OPENROUTER_PORT}`,
      cwd: root,
      url: `http://127.0.0.1:${FAKE_OPENROUTER_PORT}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
