// Asserts the renderer's settings map to the correct CLI flags.
import assert from "node:assert/strict";
import { buildArgs } from "../electron/buildArgs.js";

// Minimal: just a video → always run + --json, no stray flags.
{
  const a = buildArgs({ video: "/v/a.mp4" });
  assert.deepEqual(a, ["run", "jap-video-sub", "run", "/v/a.mp4", "--json"]);
}

// Full settings map to the right flags, in order.
{
  const a = buildArgs({
    video: "/v/Lecture 12.mp4",
    output: "/out/subs.srt",
    whisperModel: "turbo",
    openaiModel: "gpt-4o-mini",
    notes: "calc lecture",
    chunkMinutes: 5,
    keepJapanese: true,
    keepNonSpeech: true,
    force: true,
  });
  assert.deepEqual(a, [
    "run", "jap-video-sub", "run", "/v/Lecture 12.mp4", "--json",
    "--output", "/out/subs.srt",
    "--whisper-model", "turbo",
    "--openai-model", "gpt-4o-mini",
    "--notes", "calc lecture",
    "--chunk-minutes", "5",
    "--keep-japanese",
    "--keep-non-speech",
    "--force",
  ]);
}

// chunkMinutes:0 (disable chunking) must still be passed, not dropped.
{
  const a = buildArgs({ video: "x", chunkMinutes: 0 });
  assert.ok(a.includes("--chunk-minutes"));
  assert.equal(a[a.indexOf("--chunk-minutes") + 1], "0");
}

// False toggles must NOT add flags.
{
  const a = buildArgs({ video: "x", keepJapanese: false, keepNonSpeech: false, force: false });
  assert.ok(!a.includes("--keep-japanese"));
  assert.ok(!a.includes("--keep-non-speech"));
  assert.ok(!a.includes("--force"));
}

console.log("✓ buildArgs test passed — settings map to correct CLI flags");
