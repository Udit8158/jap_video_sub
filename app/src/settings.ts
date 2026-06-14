// User-facing run settings and their defaults. Maps onto the CLI's RunOptions.

export interface Settings {
  whisperModel: string;
  openaiModel: string;
  notes: string;
  chunkMinutes: number;
  keepJapanese: boolean;
  keepNonSpeech: boolean;
}

export const defaultSettings: Settings = {
  whisperModel: "large-v3",
  openaiModel: "gpt-4o",
  notes: "",
  chunkMinutes: 10,
  keepJapanese: false,
  keepNonSpeech: false,
};

export const WHISPER_MODELS = [
  { value: "large-v3", label: "large-v3", note: "best accuracy · ~real-time" },
  { value: "turbo", label: "turbo", note: "much faster · minor errors" },
  { value: "medium", label: "medium", note: "lighter · lower RAM" },
  { value: "small", label: "small", note: "fastest · rough draft" },
];

export const OPENAI_MODELS = [
  { value: "gpt-4o", label: "gpt-4o", note: "best quality · ~$0.19/hr" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini", note: "~18× cheaper · small dip" },
];
