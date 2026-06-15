// Run settings. The notes field is deliberately the largest, first control:
// it's the single highest-leverage accuracy lever, so it leads.

import type { Settings } from "../settings";
import { WHISPER_MODELS, OPENAI_MODELS } from "../settings";

interface Props {
  value: Settings;
  onChange: (patch: Partial<Settings>) => void;
  disabled?: boolean;
}

export function SettingsPanel({ value, onChange, disabled }: Props) {
  return (
    <div className="settings" data-testid="settings">
      <label className="field field--notes">
        <span className="field__label">Context</span>
        <textarea
          className="field__input"
          data-testid="notes"
          rows={2}
          placeholder="Tell us about this video — topic, speaker or character names, setting. This sharpens both transcription and translation."
          value={value.notes}
          disabled={disabled}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>

      <div className="settings__row">
        <label className="field">
          <span className="field__label">Speech model</span>
          <select
            className="field__input"
            data-testid="whisper-model"
            value={value.whisperModel}
            disabled={disabled}
            onChange={(e) => onChange({ whisperModel: e.target.value })}
          >
            {WHISPER_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Translator</span>
          <select
            className="field__input"
            data-testid="openai-model"
            value={value.openaiModel}
            disabled={disabled}
            onChange={(e) => onChange({ openaiModel: e.target.value })}
          >
            {OPENAI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="settings__row settings__row--compact">
        <label className="field field--chunk">
          <span className="field__label">Chunk length</span>
          <span className="field__inline">
            <input
              className="field__input field__input--num mono"
              data-testid="chunk-minutes"
              type="number"
              min={0}
              max={60}
              value={value.chunkMinutes}
              disabled={disabled}
              onChange={(e) => onChange({ chunkMinutes: Number(e.target.value) })}
            />
            <span className="field__suffix">min</span>
          </span>
        </label>

        <label className="toggle" data-testid="keep-japanese">
          <input
            type="checkbox"
            checked={value.keepJapanese}
            disabled={disabled}
            onChange={(e) => onChange({ keepJapanese: e.target.checked })}
          />
          <span>Keep Japanese .srt</span>
        </label>

        <label className="toggle" data-testid="keep-nonspeech">
          <input
            type="checkbox"
            checked={value.keepNonSpeech}
            disabled={disabled}
            onChange={(e) => onChange({ keepNonSpeech: e.target.checked })}
          />
          <span>Keep non-speech cues</span>
        </label>
      </div>
    </div>
  );
}
