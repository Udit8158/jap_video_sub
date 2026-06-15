// Browser/test EventSource: replays the captured `--simulate` fixture so the UI
// can be built and tested with zero backend. The fixture IS real CLI output, so
// the mock is always faithful to the contract.

import type { EventSource, JvsEvent, RunHandle, RunOptions } from "./types";
import fixture from "../fixtures/simulate.jsonl?raw";

const FIXTURE_EVENTS: JvsEvent[] = fixture
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as JvsEvent);

export class MockEventSource implements EventSource {
  // stepMs: delay between events. 0 = fire synchronously (deterministic tests).
  constructor(private stepMs = 60) {}

  run(
    options: RunOptions,
    onEvent: (event: JvsEvent) => void,
    onExit: (code: number | null) => void,
  ): RunHandle {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Patch file names so the UI reflects the file the user actually picked,
    // not the fixture's placeholder.
    const output =
      options.output ?? options.video.replace(/\.[^.]+$/, "") + ".en.srt";
    const events = FIXTURE_EVENTS.map((e) =>
      e.type === "run_start"
        ? { ...e, video: options.video, output }
        : e.type === "run_done"
          ? { ...e, output }
          : e,
    );

    if (this.stepMs <= 0) {
      for (const e of events) onEvent(e);
      onExit(0);
      return { cancel: () => {} };
    }

    events.forEach((e, i) => {
      const id = setTimeout(() => {
        if (cancelled) return;
        onEvent(e);
        if (i === events.length - 1) onExit(0);
      }, i * this.stepMs);
      timers.push(id);
    });

    return {
      cancel: () => {
        cancelled = true;
        timers.forEach(clearTimeout);
        onExit(null);
      },
    };
  }
}
