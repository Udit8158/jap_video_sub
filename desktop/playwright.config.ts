import { defineConfig, devices } from "@playwright/test";

// Tests run the renderer as a plain web page (Vite dev server) using the mock
// EventSource — no Electron, no display needed. This is why the EventSource seam
// exists: the UI is fully testable headlessly.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
