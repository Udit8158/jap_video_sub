// Node-level test of the Electron main-process bridge logic: spawn the real CLI
// with --json --simulate, line-buffer stdout, JSON.parse each line, and assert
// the stream is well-formed. This exercises the exact code path in
// electron/main.js without needing a GUI/display.
//
// Run: node app/tests/bridge.test.mjs   (cwd anywhere; resolves repo root)

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function runSimulated() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "uv",
      ["run", "jap-video-sub", "run", "Bridge Test.mp4", "--json", "--simulate"],
      { cwd: REPO_ROOT },
    );
    const events = [];
    let buffer = "";
    child.stdout.on("data", (data) => {
      buffer += data.toString();
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) events.push(JSON.parse(line)); // throws on malformed JSON
      }
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, events, stderr }));
  });
}

const { code, events } = await runSimulated();

assert.equal(code, 0, "CLI should exit 0");
assert.ok(events.length > 10, `expected many events, got ${events.length}`);
assert.equal(events[0].type, "run_start", "first event is run_start");
assert.equal(events.at(-1).type, "run_done", "last event is run_done");

// The bridge must preserve the picked filename.
assert.equal(events[0].video, "Bridge Test.mp4");

// Every chunk in the plan must reach chunk_done.
const plan = events.find((e) => e.type === "plan");
assert.ok(plan, "has a plan event");
const dones = events.filter((e) => e.type === "chunk_done").map((e) => e.index);
assert.deepEqual(
  dones,
  Array.from({ length: plan.total }, (_, i) => i + 1),
  "all chunks completed",
);

console.log(`✓ bridge test passed — ${events.length} events, ${plan.total} chunks, exit ${code}`);
