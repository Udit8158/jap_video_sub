"""Post-transcription cleanup that removes Whisper's non-speech hallucinations.

On non-speech audio (moaning, breathing, silence) Whisper invents tokens —
repeated names, climbing numbers, endless vowels. This runs on the Japanese
segments BEFORE translation, so we neither translate nor pay for the junk.

Three safe, deterministic passes:
  1. drop implausibly short artifact cues (< min_duration),
  2. collapse runs of identical adjacent cues into one,
  3. optionally drop non-lexical sound cues (elongated single-vowel moans).
"""

from __future__ import annotations

import re

from .srt import Segment

# Normalize small/katakana vowels (and ン) to a canonical hiragana vowel so
# "あぁぁ", "アアア", "ああ" all compare equal.
_NORM = str.maketrans(
    {
        "ぁ": "あ", "ァ": "あ", "ア": "あ",
        "ぃ": "い", "ィ": "い", "イ": "い",
        "ぅ": "う", "ゥ": "う", "ウ": "う",
        "ぇ": "え", "ェ": "え", "エ": "え",
        "ぉ": "お", "ォ": "お", "オ": "お",
        "ン": "ん",
    }
)
# punctuation / spaces / elongation marks to ignore when judging a cue
_STRIP = re.compile(r"[\s、。,.!?！？…ー〜~・「」『』ッっ]")
_VOWELS = set("あいうえおん")


def _is_nonspeech_sound(text: str) -> bool:
    """True for elongated single-vowel moans (あああ, んんん, ううう, あ、あ、あ).

    Requires 3+ identical vowel sounds, so real short interjections — はい (yes),
    うん (yeah), いや (no), ええ, いい (good) — are never matched.
    """
    s = _STRIP.sub("", text).translate(_NORM)
    if len(s) < 3:
        return False
    chars = set(s)
    return len(chars) == 1 and next(iter(chars)) in _VOWELS


def clean_segments(
    segments: list[Segment],
    min_duration: float = 0.15,
    drop_nonspeech: bool = True,
) -> list[Segment]:
    # 1. drop micro-cues (hallucination artifacts; real speech isn't this short)
    out = [s for s in segments if (s.end - s.start) >= min_duration]

    # 2. collapse identical adjacent cues (58x "Charlotte" -> 1, moan runs -> 1)
    collapsed: list[Segment] = []
    for s in out:
        if collapsed and collapsed[-1].text.strip() == s.text.strip():
            collapsed[-1].end = max(collapsed[-1].end, s.end)
        else:
            collapsed.append(Segment(0, s.start, s.end, s.text))

    # 3. optionally drop non-lexical moans
    if drop_nonspeech:
        collapsed = [s for s in collapsed if not _is_nonspeech_sound(s.text)]

    for i, s in enumerate(collapsed, start=1):
        s.index = i
    return collapsed
