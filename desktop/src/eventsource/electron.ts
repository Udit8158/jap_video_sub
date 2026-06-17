// Production EventSource: drives the real CLI through the Electron main process.
// The main process spawns `subly run --json`, reads stdout line-by-line,
// and pushes parsed events here over IPC (see electron/main.js + preload.js).

import type { EventSource, SublyEvent, RunHandle, RunOptions } from "./types";

export class ElectronEventSource implements EventSource {
  run(
    options: RunOptions,
    onEvent: (event: SublyEvent) => void,
    onExit: (code: number | null) => void,
  ): RunHandle {
    const bridge = window.subly;
    if (!bridge) throw new Error("Electron bridge (window.subly) not available");

    const jobId = bridge.startRun(options);
    const offEvent = bridge.onEvent(jobId, onEvent);
    const offExit = bridge.onExit(jobId, (code) => {
      offEvent();
      offExit();
      onExit(code);
    });

    return { cancel: () => bridge.cancelRun(jobId) };
  }
}

// True when running inside Electron (the preload bridge is present).
export function hasElectronBridge(): boolean {
  return typeof window !== "undefined" && !!window.subly;
}
