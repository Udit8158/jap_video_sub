// Preload: the secure bridge between the sandboxed renderer and the main
// process. CommonJS (.cjs) on purpose — Electron loads preload scripts as
// CommonJS under the default sandbox; an ESM preload silently fails to load.
//
// Exposes a small, explicit `window.jvs` API via contextBridge. The renderer
// owns the job id (no async id handshake), so listeners can attach synchronously
// right after startRun.

const { contextBridge, ipcRenderer, webUtils } = require("electron");

function newJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function on(channel, cb) {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("jvs", {
  startRun: (options) => {
    const jobId = newJobId();
    ipcRenderer.send("jvs:start-run", { jobId, options });
    return jobId;
  },
  cancelRun: (jobId) => ipcRenderer.send("jvs:cancel-run", { jobId }),
  onEvent: (jobId, cb) => on(`jvs:event:${jobId}`, cb),
  onExit: (jobId, cb) => on(`jvs:exit:${jobId}`, cb),

  pickFile: () => ipcRenderer.invoke("jvs:pick-file"),
  revealInFinder: (p) => ipcRenderer.invoke("jvs:reveal", p),
  hasApiKey: () => ipcRenderer.invoke("jvs:has-key"),
  setApiKey: (key) => ipcRenderer.invoke("jvs:set-key", key),
  // Resolve a dropped File to its absolute path (Electron 32+ removed File.path).
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return null;
    }
  },
});
