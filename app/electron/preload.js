// Preload: the secure bridge between the sandboxed renderer and the main
// process. Exposes a small, explicit `window.jvs` API via contextBridge — the
// renderer never gets raw Node/IPC access.

import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("jvs", {
  startRun: (options) => {
    // start-run returns a promise<jobId>, but the renderer wants a sync handle.
    // We mint the jobId on the main side and wire listeners once it resolves.
    // To keep the EventSource API synchronous, we bridge through a local id.
    const localId = `job_${Math.random().toString(36).slice(2)}`;
    ipcRenderer.invoke("jvs:start-run", options).then((realId) => {
      pending.set(localId, realId);
      // Re-point any listeners registered against the localId to realId.
      (rewireQueue.get(localId) || []).forEach((fn) => fn(realId));
      rewireQueue.delete(localId);
    });
    return localId;
  },
  cancelRun: (localId) => {
    const realId = pending.get(localId);
    if (realId) ipcRenderer.invoke("jvs:cancel-run", realId);
  },
  onEvent: (localId, cb) => subscribe(localId, "event", cb),
  onExit: (localId, cb) => subscribe(localId, "exit", cb),

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

// --- localId -> realId bridging -------------------------------------------
// startRun is async on the main side but the renderer wants a sync id, so we
// return a localId immediately and rewire listeners when the realId arrives.
const pending = new Map(); // localId -> realId
const rewireQueue = new Map(); // localId -> [fn(realId)]

function subscribe(localId, kind, cb) {
  let channel = null;
  let listener = null;

  const attach = (realId) => {
    channel = kind === "event" ? `jvs:event:${realId}` : `jvs:exit:${realId}`;
    listener = (_e, payload) => cb(payload);
    ipcRenderer.on(channel, listener);
  };

  const realId = pending.get(localId);
  if (realId) {
    attach(realId);
  } else {
    // Queue until startRun resolves the realId.
    const q = rewireQueue.get(localId) || [];
    q.push(attach);
    rewireQueue.set(localId, q);
  }

  return () => {
    if (channel && listener) ipcRenderer.removeListener(channel, listener);
  };
}
