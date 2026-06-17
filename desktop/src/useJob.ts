// Turns the raw SublyEvent stream into structured UI state via a reducer. This is
// the heart of the renderer — every visual (timeline, progress, finish screen)
// reads from JobState, never from raw events. Pure and framework-light so it's
// trivial to unit-test.

import { useCallback, useReducer, useRef } from "react";
import type { EventSource, SublyEvent, RunOptions } from "./eventsource/types";

export type ChunkStage = "pending" | "transcribing" | "translating" | "done";

export interface ChunkState {
  index: number;
  start: number;
  end: number;
  stage: ChunkStage;
  cached: boolean;
  jaLines?: number;
  enLines?: number;
  peakGb?: number;
  transcribeSeconds?: number;
  transcribeDone?: number;
  transcribeTotal?: number;
  translateSeconds?: number;
  translateDone?: number;
  translateTotal?: number;
}

export type JobStatus = "idle" | "running" | "done" | "error" | "cancelled";

export interface JobState {
  status: JobStatus;
  video?: string;
  output?: string;
  duration?: number;
  estUsd?: number;
  estSeconds?: number;
  whisperModel?: string;
  openaiModel?: string;
  notes?: string;
  total: number;
  overallPct: number;
  etaSeconds: number;
  chunks: ChunkState[];
  jaLines?: number;
  enLines?: number;
  elapsedSeconds?: number;
  cachedResult?: boolean;
  error?: string;
  events: SublyEvent[];
}

export const initialState: JobState = {
  status: "idle",
  total: 0,
  overallPct: 0,
  etaSeconds: 0,
  chunks: [],
  events: [],
};

type Action = { kind: "event"; event: SublyEvent } | { kind: "reset" } | { kind: "cancelled" };

function patchChunk(
  chunks: ChunkState[],
  index: number,
  patch: Partial<ChunkState>,
): ChunkState[] {
  return chunks.map((c) => (c.index === index ? { ...c, ...patch } : c));
}

export function reducer(state: JobState, action: Action): JobState {
  if (action.kind === "reset") return { ...initialState };
  if (action.kind === "cancelled") return { ...state, status: "cancelled" };

  const e = action.event;
  const s = { ...state, events: [...state.events, e] };

  switch (e.type) {
    case "run_start":
      return {
        ...s,
        status: "running",
        video: e.video,
        output: e.output,
        whisperModel: e.whisper_model,
        openaiModel: e.openai_model,
        notes: e.notes,
      };
    case "audio_ready":
      return { ...s, duration: e.duration };
    case "estimate":
      return { ...s, estUsd: e.est_usd, estSeconds: e.est_seconds };
    case "plan":
      return {
        ...s,
        total: e.total,
        chunks: e.chunks.map((c) => ({
          index: c.index,
          start: c.start,
          end: c.end,
          stage: "pending" as ChunkStage,
          cached: false,
        })),
      };
    case "chunk_start":
      return {
        ...s,
        overallPct: e.overall_pct,
        etaSeconds: e.eta_seconds,
        total: e.total,
        // Ensure the chunk exists even if no plan event arrived (single chunk).
        chunks: s.chunks.some((c) => c.index === e.index)
          ? s.chunks
          : [
              ...s.chunks,
              {
                index: e.index,
                start: e.start,
                end: e.end,
                stage: "pending",
                cached: false,
              },
            ],
      };
    case "stage_start":
      return {
        ...s,
        chunks: patchChunk(s.chunks, e.index, {
          stage: e.stage === "transcribe" ? "transcribing" : "translating",
        }),
      };
    case "transcribe_progress":
      return {
        ...s,
        chunks: patchChunk(s.chunks, e.index, {
          transcribeDone: e.done,
          transcribeTotal: e.total,
        }),
      };
    case "transcribe_done":
      return {
        ...s,
        chunks: patchChunk(s.chunks, e.index, {
          jaLines: e.lines,
          peakGb: e.peak_gb,
          transcribeSeconds: e.seconds,
        }),
      };
    case "translate_progress":
      return {
        ...s,
        chunks: patchChunk(s.chunks, e.index, {
          translateDone: e.done,
          translateTotal: e.total,
        }),
      };
    case "translate_done":
      return {
        ...s,
        chunks: patchChunk(s.chunks, e.index, {
          enLines: e.lines,
          translateSeconds: e.seconds,
        }),
      };
    case "cached":
      return {
        ...s,
        chunks: patchChunk(s.chunks, e.index, {
          cached: true,
          ...(e.scope === "both" || e.scope === "translate"
            ? { stage: "done" as ChunkStage }
            : {}),
          ...(typeof e.lines === "number"
            ? { jaLines: e.lines, enLines: e.lines }
            : {}),
        }),
      };
    case "chunk_done":
      return {
        ...s,
        overallPct: e.overall_pct,
        etaSeconds: e.eta_seconds,
        chunks: patchChunk(s.chunks, e.index, { stage: "done" }),
      };
    case "run_done":
      return {
        ...s,
        status: "done",
        output: e.output,
        jaLines: e.ja_lines,
        enLines: e.en_lines,
        elapsedSeconds: e.seconds,
        overallPct: 100,
        etaSeconds: 0,
        cachedResult: e.cached === true,
        chunks: s.chunks.map((c) => ({ ...c, stage: "done" as ChunkStage })),
      };
    case "error":
      return e.fatal
        ? { ...s, status: "error", error: e.message }
        : s;
    default:
      return s;
  }
}

// Fraction (0..1) of one chunk's total work that's complete, blending its two
// stages. Transcription dominates wall-clock time, so it carries most of the
// weight — this keeps the overall bar honest rather than jumping 0→100 at chunk
// boundaries (which is all the coarse `overall_pct` event gives, esp. for a
// single chunk).
const TRANSCRIBE_WEIGHT = 0.85;
const TRANSLATE_WEIGHT = 0.15;

function chunkFraction(c: ChunkState): number {
  if (c.stage === "done" || c.enLines != null) return 1;
  let f = 0;
  // Transcribe stage.
  if (c.cached || c.jaLines != null || c.stage === "translating") {
    f += TRANSCRIBE_WEIGHT;
  } else if (c.transcribeTotal && c.transcribeTotal > 0) {
    f += TRANSCRIBE_WEIGHT * ((c.transcribeDone ?? 0) / c.transcribeTotal);
  }
  // Translate stage.
  if (c.translateTotal && c.translateTotal > 0) {
    f += TRANSLATE_WEIGHT * ((c.translateDone ?? 0) / c.translateTotal);
  }
  return f;
}

/** Overall job progress (0..100), derived from real per-chunk sub-progress so
 * the top bar advances smoothly within a chunk, not just between chunks. */
export function overallPercent(state: JobState): number {
  if (state.status === "done") return 100;
  const total = state.total || state.chunks.length;
  if (!total) return 0;
  const sum = state.chunks.reduce((acc, c) => acc + chunkFraction(c), 0);
  return Math.min(100, Math.round((sum / total) * 100));
}

export function useJob(source: EventSource) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const handleRef = useRef<{ cancel: () => void } | null>(null);

  const start = useCallback(
    (options: RunOptions) => {
      dispatch({ kind: "reset" });
      handleRef.current = source.run(
        options,
        (event) => dispatch({ kind: "event", event }),
        () => {
          handleRef.current = null;
        },
      );
    },
    [source],
  );

  const cancel = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    dispatch({ kind: "cancelled" });
  }, []);

  return { state, start, cancel };
}
