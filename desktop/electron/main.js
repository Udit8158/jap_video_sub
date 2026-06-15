// Electron main process.
//
// Responsibilities:
//   1. Create the window (loads the Vite dev server in dev, the built files in
//      production).
//   2. Bridge the renderer to the real CLI: on "jvs:start-run", spawn
//      `jap-video-sub run --json ...`, read stdout line-by-line, parse each JSON
//      event, and forward it to the renderer over IPC.
//
// The spawn is the ONLY place that knows how to launch the pipeline. Today it
// shells out to `uv run` in the repo. The "ship to others" version will swap
// this for a bundled runtime — the renderer never changes.

import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getKey, setKey } from "./keychain.js";
import { buildArgs } from "./buildArgs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The Python CLI lives in the sibling `cli/` package (desktop/electron -> repo
// root -> cli). This is the only place the desktop app knows where the engine is.
const CLI_DIR = path.resolve(__dirname, "..", "..", "cli");
const DEV_URL = process.env.JVS_DEV_URL;

/** True if the repo .env already holds a usable OPENAI_API_KEY (dev fallback so
 * personal use doesn't get nagged for a key it already has). */
function envFileHasKey() {
  try {
    const txt = fs.readFileSync(path.join(CLI_DIR, ".env"), "utf8");
    const m = txt.match(/^\s*OPENAI_API_KEY\s*=\s*(.+?)\s*$/m);
    const v = m && m[1].trim().replace(/^["']|["']$/g, "");
    return !!v && v.startsWith("sk-") && !/your-key|\.\.\./.test(v);
  } catch {
    return false;
  }
}

const jobs = new Map(); // jobId -> child process

async function startRun(event, jobId, options) {
  const sender = event.sender;
  // Inject the Keychain key into the child's environment. If none is stored, we
  // fall through to whatever the CLI finds itself (e.g. a .env in dev).
  const key = await getKey().catch(() => null);
  const env = { ...process.env };
  if (key) env.OPENAI_API_KEY = key;

  const child = spawn("uv", buildArgs(options), { cwd: CLI_DIR, env });
  jobs.set(jobId, child);

  let buffer = "";
  const onData = (data) => {
    buffer += data.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const evt = JSON.parse(line);
        if (!sender.isDestroyed()) sender.send(`jvs:event:${jobId}`, evt);
      } catch {
        // Non-JSON line on stdout (shouldn't happen in --json mode). Surface as
        // a log event rather than crashing the stream.
        if (!sender.isDestroyed())
          sender.send(`jvs:event:${jobId}`, {
            type: "log",
            t: Date.now() / 1000,
            message: line,
          });
      }
    }
  };

  child.stdout.on("data", onData);

  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  child.on("error", (err) => {
    if (!sender.isDestroyed())
      sender.send(`jvs:event:${jobId}`, {
        type: "error",
        t: Date.now() / 1000,
        stage: "spawn",
        message: `Failed to launch CLI: ${err.message}`,
        fatal: true,
      });
  });

  child.on("close", (code) => {
    jobs.delete(jobId);
    if (code !== 0 && stderr && !sender.isDestroyed()) {
      sender.send(`jvs:event:${jobId}`, {
        type: "error",
        t: Date.now() / 1000,
        stage: "process",
        message: stderr.trim().split("\n").slice(-3).join("\n"),
        fatal: true,
      });
    }
    if (!sender.isDestroyed()) sender.send(`jvs:exit:${jobId}`, code);
  });
}

function registerIpc() {
  // Renderer owns the job id, so these are fire-and-forget sends; listeners can
  // attach synchronously right after startRun returns.
  ipcMain.on("jvs:start-run", (event, { jobId, options }) => {
    startRun(event, jobId, options); // async; events arrive over IPC
  });

  ipcMain.on("jvs:cancel-run", (_event, { jobId }) => {
    const child = jobs.get(jobId);
    if (child) child.kill("SIGTERM");
  });

  // Onboarding only needs to know whether a key is available — the secret itself
  // never crosses back to the renderer. Keychain first, then the dev .env.
  ipcMain.handle("jvs:has-key", async () => {
    try {
      if (await getKey()) return true;
    } catch {
      /* fall through to .env check */
    }
    return envFileHasKey();
  });
  ipcMain.handle("jvs:set-key", async (_event, key) => {
    await setKey(String(key).trim());
  });

  ipcMain.handle("jvs:pick-file", async () => {
    const res = await dialog.showOpenDialog({
      title: "Choose a Japanese-audio video",
      properties: ["openFile"],
      filters: [
        { name: "Media", extensions: ["mp4", "mkv", "mov", "m4v", "webm", "mp3", "wav", "m4a", "aac", "flac"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  });

  ipcMain.handle("jvs:reveal", (_event, p) => {
    if (p) shell.showItemInFolder(p);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f1115",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
