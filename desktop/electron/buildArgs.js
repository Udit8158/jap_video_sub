// Pure translation of the renderer's RunOptions into CLI argv. Kept separate
// from main.js (no electron import) so the settings→flags mapping is unit-tested.

export function buildArgs(options) {
  const args = ["run", "subly", "run", options.video, "--json"];
  if (options.output) args.push("--output", options.output);
  if (options.whisperModel) args.push("--whisper-model", options.whisperModel);
  if (options.openaiModel) args.push("--openai-model", options.openaiModel);
  if (options.notes) args.push("--notes", options.notes);
  if (options.chunkMinutes != null)
    args.push("--chunk-minutes", String(options.chunkMinutes));
  if (options.keepJapanese) args.push("--keep-japanese");
  if (options.keepNonSpeech) args.push("--keep-non-speech");
  if (options.force) args.push("--force");
  if (options.simulate) args.push("--simulate");
  return args;
}
