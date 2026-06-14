"""Local Japanese speech-to-text using Apple-Silicon-native MLX Whisper."""

from __future__ import annotations

import os
from pathlib import Path

# Hide Hugging Face's "Fetching N files" cache-check bars, which print on every
# run (even when fully cached) and look like a re-download. Must be set before
# huggingface_hub is imported (mlx_whisper pulls it in).
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")


def _quiet_hf_logging() -> None:
    """Silence the noisy 'unauthenticated requests to the HF Hub' warning."""
    import logging

    logging.getLogger("huggingface_hub").setLevel(logging.ERROR)

from .srt import Segment

# Friendly name -> mlx-community HF repo.
# large-v3 = best Japanese accuracy. turbo = ~4x faster, slightly less accurate.
MODELS = {
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "turbo": "mlx-community/whisper-large-v3-turbo",
    "medium": "mlx-community/whisper-medium-mlx",
    "small": "mlx-community/whisper-small-mlx",
}


def clear_cache() -> None:
    """Release MLX's GPU buffer cache between chunks to keep memory bounded."""
    try:
        import mlx.core as mx

        mx.clear_cache()
    except Exception:
        pass


def set_cache_limit(gb: float) -> None:
    """Cap MLX's reuse pool of freed buffers (gb<=0 leaves it unlimited).

    This only limits *idle/freed* memory MLX hoards for fast reallocation; it
    never touches active model weights or working tensors, so results are
    identical. It just stops the cache from ballooning over a long run.
    """
    if gb <= 0:
        return
    try:
        import mlx.core as mx

        mx.set_cache_limit(int(gb * 1024**3))
    except Exception:
        pass


def reset_peak_memory() -> None:
    try:
        import mlx.core as mx

        mx.reset_peak_memory()
    except Exception:
        pass


def peak_memory_gb() -> float:
    """Peak active memory (GB) since the last reset; 0.0 if unavailable."""
    try:
        import mlx.core as mx

        return mx.get_peak_memory() / 1024**3
    except Exception:
        return 0.0


def preload(model: str = "large-v3") -> None:
    """Load the model weights into memory ahead of decoding.

    mlx-whisper otherwise loads lazily inside transcribe(), producing a silent
    10-30s gap before its progress bar appears. Priming the shared ModelHolder
    here lets the CLI show a spinner for the load, after which transcribe()
    reuses the cached model and the decode progress bar starts immediately.
    """
    import mlx.core as mx
    from mlx_whisper.transcribe import ModelHolder

    _quiet_hf_logging()
    repo = MODELS.get(model, model)
    ModelHolder.get_model(repo, mx.float16)  # matches transcribe()'s default dtype


def transcribe(
    audio_path: Path,
    model: str = "large-v3",
    initial_prompt: str | None = None,
    verbose: bool | None = None,
    refine: bool = True,
    split_gap: float = 0.8,
    drop_nonspeech: bool = True,
) -> list[Segment]:
    """Transcribe Japanese audio to time-stamped Japanese segments.

    The model weights download once from Hugging Face and are then cached.

    verbose=None  -> live tqdm progress bar over the audio (with ETA)
    verbose=True  -> progress bar AND each decoded segment printed
    verbose=False -> silent

    refine=True snaps each cue to its actual spoken word boundaries and splits
    a cue wherever speech pauses for more than `split_gap` seconds, which fixes
    most off-by-a-beat sync and over-long-block issues.

    condition_on_previous_text is disabled to stop the self-reinforcing
    hallucination loops (climbing numbers, repeated names) that Whisper falls
    into on non-speech audio. Output is then run through clean.clean_segments.
    """
    from . import clean  # local import to avoid a cycle at module load
    import mlx_whisper  # imported lazily so `--help` etc. stay fast

    _quiet_hf_logging()
    repo = MODELS.get(model, model)  # allow passing a raw repo id too
    result = mlx_whisper.transcribe(
        str(audio_path),
        path_or_hf_repo=repo,
        language="ja",
        task="transcribe",
        word_timestamps=True,
        initial_prompt=initial_prompt,
        condition_on_previous_text=False,  # break hallucination feedback loops
        verbose=verbose,
    )

    raw = result.get("segments", [])
    segments = _refine(raw, split_gap) if refine else _plain(raw)
    segments = clean.clean_segments(segments, drop_nonspeech=drop_nonspeech)
    # renumber 1..N after any splitting/merging/cleanup
    for i, seg in enumerate(segments, start=1):
        seg.index = i
    return segments


def _plain(raw: list[dict]) -> list[Segment]:
    """Fallback: use Whisper's coarse segment-level timestamps as-is."""
    out: list[Segment] = []
    for seg in raw:
        text = (seg.get("text") or "").strip()
        if text:
            out.append(Segment(0, float(seg["start"]), float(seg["end"]), text))
    return out


def _refine(raw: list[dict], split_gap: float) -> list[Segment]:
    """Rebuild cues from word-level timestamps for tighter sync.

    - Each cue starts/ends on a real spoken word (no silence padding).
    - A long internal pause (> split_gap) starts a new cue, so two utterances
      separated by silence don't share one timestamp.
    """
    out: list[Segment] = []
    for seg in raw:
        words = [w for w in (seg.get("words") or []) if w.get("word", "").strip()]
        if not words:
            # No word timings (e.g. music/non-speech) — fall back to segment span.
            text = (seg.get("text") or "").strip()
            if text:
                out.append(Segment(0, float(seg["start"]), float(seg["end"]), text))
            continue

        cue_words: list[dict] = []
        prev_end: float | None = None
        for w in words:
            if prev_end is not None and float(w["start"]) - prev_end > split_gap:
                out.append(_cue_from_words(cue_words))
                cue_words = []
            cue_words.append(w)
            prev_end = float(w["end"])
        if cue_words:
            out.append(_cue_from_words(cue_words))
    return out


def _cue_from_words(words: list[dict]) -> Segment:
    text = "".join(w["word"] for w in words).strip()
    start = float(words[0]["start"])
    end = float(words[-1]["end"])
    if end <= start:  # guard against zero/negative-length cues
        end = start + 0.3
    return Segment(0, start, end, text)
