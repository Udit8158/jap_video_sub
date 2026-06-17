// Shape of the bridge the preload script exposes on window.subly. Keep in sync
// with electron/preload.js.
import type { SublyEvent, RunOptions } from "./eventsource/types";

declare global {
  interface Window {
    subly?: {
      startRun: (options: RunOptions) => string;
      cancelRun: (jobId: string) => void;
      onEvent: (jobId: string, cb: (e: SublyEvent) => void) => () => void;
      onExit: (jobId: string, cb: (code: number | null) => void) => () => void;
      pickFile?: () => Promise<string | null>;
      revealInFinder?: (path: string) => void;
      pathForFile?: (file: File) => string | null;
      hasApiKey?: () => Promise<boolean>;
      setApiKey?: (key: string) => Promise<void>;
    };
  }
}

export {};
