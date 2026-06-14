// The processing screen. The timeline is the hero; below it, a compact readout
// of the chunk currently being worked, plus overall progress and ETA.

import type { JobState } from "../useJob";
import { Timeline } from "./Timeline";
import { clock, dur, basename } from "../format";

interface Props {
  state: JobState;
  onCancel: () => void;
}

export function RunningView({ state, onCancel }: Props) {
  const active =
    state.chunks.find((c) => c.stage === "transcribing" || c.stage === "translating") ??
    state.chunks.find((c) => c.stage !== "done");

  const stageLabel = active
    ? active.stage === "transcribing"
      ? "Transcribing"
      : active.stage === "translating"
        ? "Translating"
        : "Preparing"
    : "Working";

  return (
    <section className="running" data-testid="running">
      <header className="running__head">
        <div>
          <p className="running__file mono">{basename(state.video ?? "")}</p>
          <h2 className="running__stage" data-testid="running-stage">
            {stageLabel}
            {active ? <span className="running__chunkno mono"> · chunk {active.index}/{state.total}</span> : null}
          </h2>
        </div>
        <button className="btn btn--ghost" data-testid="cancel" onClick={onCancel}>
          Cancel
        </button>
      </header>

      <div className="overall">
        <div className="overall__bar">
          <span
            className="overall__fill"
            style={{ width: `${state.overallPct}%` }}
            data-testid="overall-fill"
          />
        </div>
        <div className="overall__meta mono">
          <span data-testid="overall-pct">{state.overallPct}%</span>
          {state.etaSeconds > 0 && <span>{dur(state.etaSeconds)} left</span>}
        </div>
      </div>

      <Timeline
        chunks={state.chunks}
        duration={state.duration ?? 0}
        activeIndex={active?.index}
      />

      {active && (
        <dl className="ledger" data-testid="ledger">
          <div>
            <dt>Range</dt>
            <dd className="mono">
              {clock(active.start)}–{clock(active.end)}
            </dd>
          </div>
          <div>
            <dt>Transcribe</dt>
            <dd className="mono">
              {active.jaLines != null
                ? `${active.jaLines} lines · ${active.peakGb?.toFixed(1)} GB peak`
                : active.stage === "transcribing"
                  ? "listening…"
                  : "—"}
            </dd>
          </div>
          <div>
            <dt>Translate</dt>
            <dd className="mono">
              {active.translateTotal
                ? `${active.translateDone ?? 0}/${active.translateTotal} lines`
                : active.enLines != null
                  ? `${active.enLines} lines`
                  : "—"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
