// Launches the REAL Electron app (built dist + main.js + preload.cjs) and drives
// the REAL CLI through window.subly — the one combination the mock/browser tests
// can't cover. Proves: preload bridge loads, the .env key check skips the gate,
// and a full transcribe+translate run streams events back into the renderer and
// writes an .srt.
//
// Run: node tests/electron-smoke.mjs   (expects /tmp/subly_smoke/sample.aiff)

import { _electron as electron } from "@playwright/test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = "/tmp/subly_smoke/sample.aiff";
const OUT = "/tmp/subly_smoke/electron_test.en.srt";

assert.ok(existsSync(SAMPLE), `missing sample audio at ${SAMPLE}`);
rmSync(OUT, { force: true });

const env = { ...process.env };
delete env.SUBLY_DEV_URL; // force loading the built dist, not a dev server

const app = await electron.launch({ args: [APP_DIR], cwd: APP_DIR, env });
try {
  const win = await app.firstWindow();
  await win.waitForLoadState("domcontentloaded");

  // 1. Preload bridge actually loaded.
  const hasBridge = await win.evaluate(() => !!window.subly);
  assert.ok(hasBridge, "window.subly (preload bridge) should be present");

  // 2. Gate is skipped because the repo .env has a key → setup screen shows.
  await win.waitForSelector('[data-testid="setup"]', { timeout: 10_000 });
  await win.screenshot({ path: "/tmp/subly_smoke/electron-setup.png" });
  console.log("✓ app launched, bridge present, gate skipped (setup visible)");

  // 3. Drive the real pipeline through the bridge and collect events.
  console.log("  running real pipeline through Electron (small model)…");
  const result = await win.evaluate(
    ({ video, output }) =>
      new Promise((resolve) => {
        const events = [];
        const id = window.subly.startRun({
          video,
          output,
          whisperModel: "small",
          openaiModel: "gpt-4o",
          notes: "Japanese math lecture intro",
        });
        window.subly.onEvent(id, (e) => events.push(e));
        window.subly.onExit(id, (code) => resolve({ code, events }));
      }),
    { video: SAMPLE, output: OUT },
  );

  const types = result.events.map((e) => e.type);
  assert.equal(result.code, 0, "CLI should exit 0 through Electron");
  assert.equal(types[0], "run_start", "first event run_start");
  assert.equal(types.at(-1), "run_done", "last event run_done");
  assert.ok(types.includes("transcribe_done"), "real transcription happened");
  assert.ok(types.includes("translate_done"), "real translation happened");
  assert.ok(existsSync(OUT), "an .srt file was written");

  const srt = readFileSync(OUT, "utf8").trim();
  assert.ok(srt.includes("-->"), "output looks like an SRT");
  console.log(
    `✓ real run through Electron — ${result.events.length} events, exit ${result.code}`,
  );
  console.log("  output .srt:");
  console.log(
    srt
      .split("\n")
      .map((l) => "    " + l)
      .join("\n"),
  );
} finally {
  await app.close();
}
