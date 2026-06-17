"""Validate the --json event contract via the deterministic --simulate stream.

These tests assert the *shape* of the event stream the desktop app depends on:
every line is valid JSON, required fields are present, and the high-level
ordering (start → plan → per-chunk stages → done) holds. They run instantly and
need no model or API key.
"""

from __future__ import annotations

import io
import json

from subly.events import EventEmitter
from subly.simulate import simulate_run


def _capture_events() -> list[dict]:
    buf = io.StringIO()
    em = EventEmitter(enabled=True, stream=buf)
    simulate_run(em, duration=1500.0, chunk_minutes=10.0, speed=0.0)
    lines = [ln for ln in buf.getvalue().splitlines() if ln.strip()]
    return [json.loads(ln) for ln in lines]  # raises if any line isn't JSON


def test_every_line_is_valid_json_with_type_and_timestamp():
    events = _capture_events()
    assert events, "expected a non-empty event stream"
    for e in events:
        assert isinstance(e.get("type"), str) and e["type"]
        assert isinstance(e.get("t"), (int, float))


def test_stream_starts_and_ends_correctly():
    events = _capture_events()
    assert events[0]["type"] == "run_start"
    assert events[-1]["type"] == "run_done"


def test_run_start_carries_settings():
    start = _capture_events()[0]
    for field in ("video", "output", "whisper_model", "openai_model", "chunk_minutes"):
        assert field in start, f"run_start missing {field}"


def test_plan_matches_chunk_events():
    events = _capture_events()
    plan = next(e for e in events if e["type"] == "plan")
    total = plan["total"]
    assert len(plan["chunks"]) == total
    # 1500s / 600s -> 3 chunks
    assert total == 3

    starts = [e["index"] for e in events if e["type"] == "chunk_start"]
    dones = [e["index"] for e in events if e["type"] == "chunk_done"]
    assert starts == list(range(1, total + 1))
    assert dones == list(range(1, total + 1))


def test_each_chunk_has_both_stages_in_order():
    events = _capture_events()
    plan = next(e for e in events if e["type"] == "plan")
    for idx in range(1, plan["total"] + 1):
        seq = [
            e["type"]
            for e in events
            if e.get("index") == idx
            and e["type"] in ("chunk_start", "stage_start", "transcribe_done",
                              "translate_done", "chunk_done")
        ]
        # chunk_start, (transcribe stage), transcribe_done, (translate stage),
        # translate_done, chunk_done
        assert seq[0] == "chunk_start"
        assert seq[-1] == "chunk_done"
        assert "transcribe_done" in seq
        assert "translate_done" in seq
        assert seq.index("transcribe_done") < seq.index("translate_done")


def test_translate_progress_is_monotonic_and_bounded():
    events = _capture_events()
    by_chunk: dict[int, list[dict]] = {}
    for e in events:
        if e["type"] == "translate_progress":
            by_chunk.setdefault(e["index"], []).append(e)
    assert by_chunk, "expected translate_progress events"
    for idx, evs in by_chunk.items():
        total = evs[-1]["total"]
        last = -1
        for e in evs:
            assert 0 <= e["done"] <= total
            assert e["done"] >= last  # non-decreasing
            last = e["done"]
        assert evs[-1]["done"] == total  # ends at 100%


def test_transcribe_progress_is_monotonic_and_bounded():
    events = _capture_events()
    by_chunk: dict[int, list[dict]] = {}
    for e in events:
        if e["type"] == "transcribe_progress":
            by_chunk.setdefault(e["index"], []).append(e)
    assert by_chunk, "expected transcribe_progress events"
    for idx, evs in by_chunk.items():
        total = evs[-1]["total"]
        last = -1
        for e in evs:
            assert 0 <= e["done"] <= total
            assert e["done"] >= last  # non-decreasing
            last = e["done"]
        assert evs[-1]["done"] == total  # ends at 100%


def test_transcribe_progress_precedes_transcribe_done():
    events = _capture_events()
    plan = next(e for e in events if e["type"] == "plan")
    for idx in range(1, plan["total"] + 1):
        seq = [e["type"] for e in events if e.get("index") == idx]
        assert "transcribe_progress" in seq
        assert seq.index("transcribe_progress") < seq.index("transcribe_done")
