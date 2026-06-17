"""Extract a Whisper-friendly audio track from any video/audio file via ffmpeg."""

from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "ffmpeg not found on PATH. Install it with: brew install ffmpeg"
        )


def extract_audio(src: Path, dst: Path) -> Path:
    """Convert `src` to 16kHz mono 16-bit PCM WAV at `dst`.

    16kHz mono is exactly what Whisper expects, so this avoids any
    resampling inside the model and keeps the file tiny.
    """
    ensure_ffmpeg()
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",                 # overwrite
        "-i", str(src),
        "-vn",                # drop video
        "-ac", "1",           # mono
        "-ar", "16000",       # 16 kHz
        "-c:a", "pcm_s16le",  # 16-bit PCM
        "-loglevel", "error",
        str(dst),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{proc.stderr.strip()}")
    if not dst.exists() or dst.stat().st_size == 0:
        raise RuntimeError("ffmpeg produced no audio output.")
    return dst


def probe_duration(path: Path) -> float:
    """Return media duration in seconds via ffprobe."""
    proc = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except ValueError:
        raise RuntimeError(f"Could not read duration of {path}")


def detect_silences(
    wav: Path, noise_db: float = -30.0, min_silence: float = 0.4
) -> list[tuple[float, float]]:
    """Return (start, end) of silent stretches, used to pick clean cut points."""
    cmd = [
        "ffmpeg", "-i", str(wav),
        "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}",
        "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    silences: list[tuple[float, float]] = []
    start: float | None = None
    for line in proc.stderr.splitlines():
        if "silence_start:" in line:
            try:
                start = float(line.split("silence_start:")[1].strip())
            except ValueError:
                start = None
        elif "silence_end:" in line and start is not None:
            try:
                end = float(line.split("silence_end:")[1].split("|")[0].strip())
                silences.append((start, end))
            except ValueError:
                pass
            start = None
    return silences


def plan_chunks(
    duration: float,
    chunk_seconds: float,
    silences: list[tuple[float, float]],
    search: float = 60.0,
) -> list[tuple[float, float]]:
    """Divide [0, duration] into ~chunk_seconds pieces, snapping each interior
    cut to the nearest silence midpoint within `search` seconds (so we don't
    slice a word in half). Falls back to a hard cut when no silence is near.
    """
    if duration <= chunk_seconds:
        return [(0.0, duration)]

    n = math.ceil(duration / chunk_seconds)
    targets = [duration * i / n for i in range(1, n)]

    cuts: list[float] = []
    for t in targets:
        best: float | None = None
        best_d: float | None = None
        for s, e in silences:
            mid = (s + e) / 2.0
            d = abs(mid - t)
            if d <= search and (best_d is None or d < best_d):
                best_d, best = d, mid
        cuts.append(best if best is not None else t)

    points = [0.0] + sorted(cuts) + [duration]
    chunks: list[tuple[float, float]] = []
    for i in range(len(points) - 1):
        if points[i + 1] - points[i] > 0.5:  # drop degenerate slivers
            chunks.append((points[i], points[i + 1]))
    return chunks


def slice_audio(wav: Path, start: float, end: float, dst: Path) -> Path:
    """Extract [start, end) of a PCM WAV losslessly (sample-exact, instant)."""
    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}", "-t", f"{end - start:.3f}",
        "-i", str(wav),
        "-c", "copy", "-loglevel", "error",
        str(dst),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg slice failed:\n{proc.stderr.strip()}")
    return dst
