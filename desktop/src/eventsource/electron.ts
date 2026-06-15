// Production EventSource: drives the real CLI through the Electron main process.
// The main process spawns `jap-video-sub run --json`, reads stdout line-by-line,
// and pushes parsed events here over IPC (see electron/main.js + preload.js).

import type { EventSource, JvsEvent, RunHandle, RunOptions } from "./types";

export class ElectronEventSource implements EventSource {
  run(
    options: RunOptions,
    onEvent: (event: JvsEvent) => void,
    onExit: (code: number | null) => void,
  ): RunHandle {
    const jvs = window.jvs;
    if (!jvs) throw new Error("Electron bridge (window.jvs) not available");

    const jobId = jvs.startRun(options);
    const offEvent = jvs.onEvent(jobId, onEvent);
    const offExit = jvs.onExit(jobId, (code) => {
      offEvent();
      offExit();
      onExit(code);
    });

    return { cancel: () => jvs.cancelRun(jobId) };
  }
}

// True when running inside Electron (the preload bridge is present).
export function hasElectronBridge(): boolean {
  return typeof window !== "undefined" && !!window.jvs;
}
