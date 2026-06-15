"""Minimal SRT model: parse, format, read, write. Timestamps are floats (seconds)."""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from pathlib import Path


@dataclass
class Segment:
    index: int
    start: float  # seconds
    end: float    # seconds
    text: str


def _fmt_ts(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    millis = int(round(seconds * 1000))
    h, millis = divmod(millis, 3_600_000)
    m, millis = divmod(millis, 60_000)
    s, millis = divmod(millis, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{millis:03d}"


def _parse_ts(ts: str) -> float:
    h, m, rest = ts.split(":")
    s, millis = rest.replace(".", ",").split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(millis) / 1000.0


def dumps(segments: list[Segment]) -> str:
    """Serialize segments to SRT text, renumbering indices from 1."""
    blocks = []
    for i, seg in enumerate(segments, start=1):
        text = seg.text.strip()
        blocks.append(f"{i}\n{_fmt_ts(seg.start)} --> {_fmt_ts(seg.end)}\n{text}\n")
    return "\n".join(blocks)


_BLOCK_RE = re.compile(
    r"(\d+)\s*\n"
    r"(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*\n"
    r"(.*?)(?=\n\s*\n|\Z)",
    re.DOTALL,
)


def loads(text: str) -> list[Segment]:
    segments = []
    for m in _BLOCK_RE.finditer(text):
        segments.append(
            Segment(
                index=int(m.group(1)),
                start=_parse_ts(m.group(2)),
                end=_parse_ts(m.group(3)),
                text=m.group(4).strip(),
            )
        )
    return segments


def write(path: Path, segments: list[Segment]) -> None:
    path.write_text(dumps(segments), encoding="utf-8")


def read(path: Path) -> list[Segment]:
    return loads(path.read_text(encoding="utf-8"))


def with_text(seg: Segment, text: str) -> Segment:
    return replace(seg, text=text)
