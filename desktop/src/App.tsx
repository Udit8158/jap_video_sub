// Orchestrates the single-window flow: setup → running → done/error, all driven
// by the JobState reducer. One window, three faces.

import { useMemo, useState } from "react";
import { makeSource, isMock } from "./source";
import { makeKeyApi } from "./keyapi";
import { useJob } from "./useJob";
import { defaultSettings, type Settings } from "./settings";
import { ApiKeyGate } from "./components/ApiKeyGate";
import { DropZone } from "./components/DropZone";
import { SettingsPanel } from "./components/Settings";
import { RunningView } from "./components/RunningView";
import { DoneView } from "./components/DoneView";

interface PickedFile {
  path: string;
  name: string;
}

export function App() {
  const source = useMemo(() => makeSource(), []);
  const keyApi = useMemo(() => makeKeyApi(), []);
  const { state, start, cancel } = useJob(source);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));

  const generate = () => {
    if (!file) return;
    start({
      video: file.path,
      whisperModel: settings.whisperModel,
      openaiModel: settings.openaiModel,
      notes: settings.notes,
      chunkMinutes: settings.chunkMinutes,
      keepJapanese: settings.keepJapanese,
      keepNonSpeech: settings.keepNonSpeech,
    });
  };

  const reset = () => {
    cancel();
    setFile(null);
  };

  const isRunning = state.status === "running";
  const isDone = state.status === "done";
  const isError = state.status === "error";
  const inSetup = !isRunning && !isDone;

  return (
    <div className="app">
      <header className="topbar">
        <span className="wordmark">
          <span className="wordmark__kanji" aria-hidden>
            字幕
          </span>
          <span className="wordmark__name mono">Subly</span>
        </span>
        {isMock() && <span className="topbar__badge" data-testid="env">demo data</span>}
      </header>

      <ApiKeyGate api={keyApi}>
      <main className="stage">
        {inSetup && (
          <section className="setup" data-testid="setup">
            <DropZone file={file} onPick={(path, name) => setFile({ path, name })} />

            <SettingsPanel value={settings} onChange={patch} />

            {isError && (
              <p className="banner banner--error" data-testid="error">
                {state.error}
              </p>
            )}

            <div className="setup__cta">
              <p className="setup__est">
                {settings.openaiModel === "gpt-4o"
                  ? "≈ $0.19 per hour of video"
                  : "≈ $0.01 per hour of video"}
                <span className="setup__est-sub"> · final cost shown when it starts</span>
              </p>
              <button
                className="btn btn--accent btn--lg"
                data-testid="generate"
                disabled={!file}
                onClick={generate}
              >
                Generate subtitles
              </button>
            </div>
          </section>
        )}

        {isRunning && <RunningView state={state} onCancel={reset} />}

        {isDone && <DoneView state={state} onReset={reset} />}
      </main>
      </ApiKeyGate>
    </div>
  );
}
