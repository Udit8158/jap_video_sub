// Completion screen. States the result plainly and offers the two next actions
// people actually want: reveal the file, or do another.

import type { JobState } from "../useJob";
import { basename, dur } from "../format";

interface Props {
  state: JobState;
  onReset: () => void;
}

export function DoneView({ state, onReset }: Props) {
  const reveal = () => {
    if (state.output) window.jvs?.revealInFinder?.(state.output);
  };

  return (
    <section className="done" data-testid="done">
      <div className="done__check" aria-hidden>
        ✓
      </div>
      <h2 className="done__title">
        {state.cachedResult ? "Already done" : "Subtitles ready"}
      </h2>
      <p className="done__file mono" data-testid="done-output">
        {basename(state.output ?? "")}
      </p>

      <dl className="done__stats mono">
        <div>
          <dt>Lines</dt>
          <dd data-testid="done-lines">{state.enLines ?? "—"}</dd>
        </div>
        <div>
          <dt>Chunks</dt>
          <dd>{state.total}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{state.elapsedSeconds != null ? dur(state.elapsedSeconds) : "—"}</dd>
        </div>
        {state.estUsd != null && (
          <div>
            <dt>Est. cost</dt>
            <dd>${state.estUsd.toFixed(2)}</dd>
          </div>
        )}
      </dl>

      <div className="done__actions">
        {window.jvs?.revealInFinder && (
          <button className="btn btn--accent" onClick={reveal} data-testid="reveal">
            Reveal in Finder
          </button>
        )}
        <button className="btn btn--ghost" onClick={onReset} data-testid="another">
          Subtitle another
        </button>
      </div>
    </section>
  );
}
