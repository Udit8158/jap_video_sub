// SIGNATURE ELEMENT: the two-stage chunk timeline.
//
// The whole video laid out left→right at true scale. Each chunk is a cell whose
// width is its real (silence-snapped) duration. Every cell has two bands:
//   · top  = transcribe (amber) — the local, on-device listening stage
//   · base = translate (teal)  — the cloud language stage
// A cell is "done" only when both bands are full. This is an honest progress
// view: it's built entirely from events the pipeline already emits.

import type { ChunkState } from "../useJob";
import { clock } from "../format";

interface Props {
  chunks: ChunkState[];
  duration: number;
  activeIndex?: number;
}

function transcribeFill(c: ChunkState): number | "indeterminate" {
  if (c.cached || c.jaLines != null || c.stage === "translating" || c.stage === "done")
    return 100;
  if (c.stage === "transcribing") return "indeterminate";
  return 0;
}

function translateFill(c: ChunkState): number {
  if (c.stage === "done" || c.enLines != null) return 100;
  if (c.translateTotal && c.translateTotal > 0)
    return Math.round(((c.translateDone ?? 0) / c.translateTotal) * 100);
  return 0;
}

export function Timeline({ chunks, duration, activeIndex }: Props) {
  const span =
    duration > 0
      ? duration
      : chunks.reduce((m, c) => Math.max(m, c.end), 0) || 1;

  return (
    <div className="timeline" data-testid="timeline">
      <div className="timeline__track">
        {chunks.map((c) => {
          const width = `${((c.end - c.start) / span) * 100}%`;
          const tf = transcribeFill(c);
          const lf = translateFill(c);
          const active = c.index === activeIndex && c.stage !== "done";
          return (
            <div
              key={c.index}
              className={`cell cell--${c.stage}${active ? " cell--active" : ""}`}
              style={{ width }}
              data-testid={`cell-${c.index}`}
              data-stage={c.stage}
              title={`Chunk ${c.index} · ${clock(c.start)}–${clock(c.end)}`}
            >
              <div className="cell__band cell__band--transcribe">
                <span
                  className={`cell__fill cell__fill--amber${
                    tf === "indeterminate" ? " is-indeterminate" : ""
                  }`}
                  style={{ width: tf === "indeterminate" ? "100%" : `${tf}%` }}
                />
              </div>
              <div className="cell__band cell__band--translate">
                <span
                  className="cell__fill cell__fill--teal"
                  style={{ width: `${lf}%` }}
                />
              </div>
              {c.cached && <span className="cell__cached" title="reused from cache" />}
            </div>
          );
        })}
      </div>
      <div className="timeline__axis">
        <span className="mono">0:00</span>
        <span className="timeline__legend">
          <i className="dot dot--amber" /> transcribe
          <i className="dot dot--teal" /> translate
        </span>
        <span className="mono">{clock(span)}</span>
      </div>
    </div>
  );
}
