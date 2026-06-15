"""Structured event stream for GUI / machine consumers.

The CLI normally prints human-friendly progress with `rich`. A desktop app (or
any other program) instead wants a stable, machine-readable stream. When the
CLI is run with `--json`, every meaningful step emits one JSON object per line
to stdout, e.g.:

    {"type": "chunk_start", "t": 1718370000.12, "index": 3, "total": 12, ...}

This module is the single source of truth for that contract. The same event
names/fields are produced by the real pipeline and by `--simulate`, so a UI can
be built and tested against the simulated stream without ever running a model
or calling an API.

Design rules:
- One JSON object per line on stdout, flushed immediately (so a reader sees
  events live, not buffered).
- Every event has `type` (str) and `t` (unix seconds, float).
- Unknown/extra fields are allowed; consumers should ignore what they don't
  understand. New event types may be added over time — treat them as optional.

Event types (payload fields beyond type/t):
  run_start         video, output, whisper_model, openai_model, notes, chunk_minutes
  audio_ready       duration            (seconds, float)
  plan              total, chunks:[{index,start,end}]
  estimate          est_usd, est_seconds
  chunk_start       index, total, start, end, overall_pct, eta_seconds
  stage_start       index, stage("transcribe"|"translate")
  transcribe_progress index, done, total   (done/total = audio frames seeked)
  transcribe_done   index, lines, seconds, peak_gb
  translate_progress index, done, total
  translate_done    index, lines, seconds
  chunk_done        index, total, seconds, overall_pct, eta_seconds
  cached            index, scope("audio"|"transcribe"|"translate"|"both")
  run_done          output, ja_lines, en_lines, seconds
  error             stage, message, fatal(bool)
"""

from __future__ import annotations

import json
import sys
import time
from typing import Any


class EventEmitter:
    """Emits JSON-lines events when enabled; a no-op otherwise.

    When disabled (the default), `emit()` does nothing, so the same `emit(...)`
    calls can live in the pipeline unconditionally and only produce output in
    `--json` mode.
    """

    def __init__(self, enabled: bool = False, stream: Any = None) -> None:
        self.enabled = enabled
        self._stream = stream or sys.stdout

    def emit(self, type: str, **fields: Any) -> None:
        if not self.enabled:
            return
        event = {"type": type, "t": round(time.time(), 3), **fields}
        line = json.dumps(event, ensure_ascii=False)
        self._stream.write(line + "\n")
        self._stream.flush()


# Module-level singleton the CLI configures once and the pipeline imports.
emitter = EventEmitter(enabled=False)


def configure(enabled: bool) -> EventEmitter:
    """Enable/disable the shared emitter (called once by the CLI)."""
    emitter.enabled = enabled
    return emitter
