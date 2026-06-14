// TypeScript mirror of the Python `events.py` contract. Keep in sync with the
// CLI: these are the JSON-lines events emitted by `jap-video-sub run --json`.

export interface BaseEvent {
  type: string;
  t: number;
}

export interface RunStartEvent extends BaseEvent {
  type: "run_start";
  video: string;
  output: string;
  whisper_model: string;
  openai_model: string;
  notes: string;
  chunk_minutes: number;
}

export interface AudioReadyEvent extends BaseEvent {
  type: "audio_ready";
  duration: number;
}

export interface PlanEvent extends BaseEvent {
  type: "plan";
  total: number;
  chunks: { index: number; start: number; end: number }[];
}

export interface EstimateEvent extends BaseEvent {
  type: "estimate";
  est_usd: number;
  est_seconds: number;
}

export interface ChunkStartEvent extends BaseEvent {
  type: "chunk_start";
  index: number;
  total: number;
  start: number;
  end: number;
  overall_pct: number;
  eta_seconds: number;
}

export interface StageStartEvent extends BaseEvent {
  type: "stage_start";
  index: number;
  stage: "transcribe" | "translate";
}

export interface TranscribeDoneEvent extends BaseEvent {
  type: "transcribe_done";
  index: number;
  lines: number;
  seconds: number;
  peak_gb: number;
}

export interface TranslateProgressEvent extends BaseEvent {
  type: "translate_progress";
  index: number;
  done: number;
  total: number;
}

export interface TranslateDoneEvent extends BaseEvent {
  type: "translate_done";
  index: number;
  lines: number;
  seconds: number;
}

export interface CachedEvent extends BaseEvent {
  type: "cached";
  index: number;
  scope: "audio" | "transcribe" | "translate" | "both";
  lines?: number;
}

export interface ChunkDoneEvent extends BaseEvent {
  type: "chunk_done";
  index: number;
  total: number;
  seconds: number;
  overall_pct: number;
  eta_seconds: number;
}

export interface RunDoneEvent extends BaseEvent {
  type: "run_done";
  output: string;
  ja_lines: number;
  en_lines: number;
  seconds: number;
  cached?: boolean;
}

export interface ErrorEvent extends BaseEvent {
  type: "error";
  stage: string;
  message: string;
  fatal: boolean;
}

// Strict discriminated union of known events (enables `switch (e.type)`
// narrowing). Unknown/future event types still arrive at runtime — the reducer's
// `default` branch ignores them — but they aren't part of the static union.
export type JvsEvent =
  | RunStartEvent
  | AudioReadyEvent
  | PlanEvent
  | EstimateEvent
  | ChunkStartEvent
  | StageStartEvent
  | TranscribeDoneEvent
  | TranslateProgressEvent
  | TranslateDoneEvent
  | CachedEvent
  | ChunkDoneEvent
  | RunDoneEvent
  | ErrorEvent;

// Options the UI collects and the CLI understands.
export interface RunOptions {
  video: string;
  output?: string;
  whisperModel?: string;
  openaiModel?: string;
  notes?: string;
  chunkMinutes?: number;
  keepJapanese?: boolean;
  keepNonSpeech?: boolean;
  force?: boolean;
  simulate?: boolean;
}

// A job handle: subscribe to events, and request cancellation.
export interface RunHandle {
  cancel: () => void;
}

// The one seam between UI and pipeline. Electron and the browser mock both
// implement this, so the React UI never knows which it's talking to.
export interface EventSource {
  run(
    options: RunOptions,
    onEvent: (event: JvsEvent) => void,
    onExit: (code: number | null) => void,
  ): RunHandle;
}
