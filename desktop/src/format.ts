// Formatting for the subject's vernacular: SRT timecodes and clock durations.
// All rendered in the mono face.

/** Clock form for durations/positions: 1:02:03 or 2:05. */
export function clock(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Human duration: "70 min", "4m 02s", "12s". */
export function dur(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.round(seconds);
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  if (s >= 60) {
    const m = Math.floor(s / 60);
    return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  }
  return `${s}s`;
}

/** Cost like $0.19. */
export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Just the filename from a path. */
export function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}
