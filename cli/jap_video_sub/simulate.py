"""Replay a realistic event stream without running the model or calling an API.

This drives UI development and automated tests: the desktop app can run
`jap-video-sub run anything.mp4 --json --simulate` and receive the exact same
event shapes the real pipeline emits, in a few seconds, deterministically.
"""

from __future__ import annotations

import time

from .events import EventEmitter


def simulate_run(
    em: EventEmitter,
    *,
    video: str = "sample.mp4",
    output: str = "sample.en.srt",
    whisper_model: str = "large-v3",
    openai_model: str = "gpt-4o",
    notes: str = "",
    chunk_minutes: float = 10.0,
    duration: float = 1500.0,  # 25 min -> 3 chunks
    speed: float = 1.0,
) -> None:
    """Emit a full, realistic run. `speed` scales the (already short) delays;
    speed=0 runs instantly (used by tests)."""

    def nap(seconds: float) -> None:
        if speed > 0:
            time.sleep(seconds * speed)

    em.emit(
        "run_start",
        video=video,
        output=output,
        whisper_model=whisper_model,
        openai_model=openai_model,
        notes=notes,
        chunk_minutes=chunk_minutes,
    )
    nap(0.1)
    em.emit("audio_ready", duration=duration)

    # Plan chunks the same way the real planner does (ceil by chunk length).
    chunk_seconds = chunk_minutes * 60 if chunk_minutes > 0 else float("inf")
    import math

    n = max(1, math.ceil(duration / chunk_seconds)) if chunk_seconds != float("inf") else 1
    bounds = [(duration * i / n, duration * (i + 1) / n) for i in range(n)]
    chunks = [
        {"index": i + 1, "start": round(s, 2), "end": round(e, 2)}
        for i, (s, e) in enumerate(bounds)
    ]
    em.emit("plan", total=n, chunks=chunks)

    # Rough cost/time estimate (mirrors README figures: ~$0.19/hr on gpt-4o).
    est_usd = round(duration / 3600.0 * 0.19, 4)
    est_seconds = round(duration * 0.6, 1)
    em.emit("estimate", est_usd=est_usd, est_seconds=est_seconds)

    t_start = time.time()
    for c in chunks:
        i, total = c["index"], n
        overall_pct = int((i - 1) / total * 100)
        eta = round((total - (i - 1)) * 4.0, 1)
        em.emit(
            "chunk_start",
            index=i,
            total=total,
            start=c["start"],
            end=c["end"],
            overall_pct=overall_pct,
            eta_seconds=eta,
        )

        # Stage 1: transcribe
        em.emit("stage_start", index=i, stage="transcribe")
        nap(0.3)
        lines = 42 + i * 3
        em.emit("transcribe_done", index=i, lines=lines, seconds=2.4, peak_gb=2.8)

        # Stage 2: translate (with incremental progress)
        em.emit("stage_start", index=i, stage="translate")
        for done in range(0, lines + 1, max(1, lines // 3)):
            nap(0.08)
            em.emit("translate_progress", index=i, done=min(done, lines), total=lines)
        em.emit("translate_progress", index=i, done=lines, total=lines)
        em.emit("translate_done", index=i, lines=lines, seconds=1.1)

        em.emit(
            "chunk_done",
            index=i,
            total=total,
            seconds=3.6,
            overall_pct=int(i / total * 100),
            eta_seconds=round((total - i) * 4.0, 1),
        )

    total_lines = sum(42 + c["index"] * 3 for c in chunks)
    em.emit(
        "run_done",
        output=output,
        ja_lines=total_lines,
        en_lines=total_lines,
        seconds=round(time.time() - t_start, 1),
    )
