// First-run onboarding: collect the OpenAI key once and store it in the
// Keychain. Renders its children only once a key is present. The secret is
// write-only from the UI's side — it goes to the Keychain and is never read
// back into the renderer.

import { useEffect, useState } from "react";
import type { KeyApi } from "../keyapi";

interface Props {
  api: KeyApi;
  children: React.ReactNode;
}

export function ApiKeyGate({ api, children }: Props) {
  const [ready, setReady] = useState(!api.required);
  const [checking, setChecking] = useState(api.required);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api.required) return;
    api.has().then((has) => {
      setReady(has);
      setChecking(false);
    });
  }, [api]);

  if (checking) return null; // brief: avoids flashing the gate before the check

  if (ready) return <>{children}</>;

  const save = async () => {
    const key = value.trim();
    if (!key.startsWith("sk-")) {
      setError("That doesn't look like an OpenAI key — they start with “sk-”.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.set(key);
      setReady(true);
    } catch {
      setError("Couldn't save to the Keychain. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="stage">
      <section className="gate" data-testid="gate">
        <span className="gate__kanji" aria-hidden>
          字幕
        </span>
        <h2 className="gate__title">Add your OpenAI key</h2>
        <p className="gate__body">
          Transcription runs entirely on your Mac. Translation uses OpenAI, so it
          needs an API key. It's stored in your macOS Keychain and only the small
          text transcript is ever sent.
        </p>
        <input
          className="field__input gate__input mono"
          data-testid="key-input"
          type="password"
          placeholder="sk-…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          autoFocus
        />
        {error && <p className="gate__error" data-testid="key-error">{error}</p>}
        <button
          className="btn btn--accent btn--lg gate__save"
          data-testid="key-save"
          onClick={save}
          disabled={saving || value.trim().length === 0}
        >
          {saving ? "Saving…" : "Save & continue"}
        </button>
        <a
          className="gate__link"
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
        >
          Where do I get a key?
        </a>
      </section>
    </div>
  );
}
