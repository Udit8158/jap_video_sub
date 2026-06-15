# Convenience wrapper for the jap-video-sub monorepo (cli/ + desktop/).
# These just save you from cd-ing around; everything works directly too.

.PHONY: help setup sub transcribe translate app test test-cli test-desktop

help:
	@echo "make setup                 - install CLI deps (cli/) and desktop deps (desktop/)"
	@echo "make sub VIDEO=path.mp4    - run the full pipeline on a video"
	@echo "make transcribe VIDEO=...  - transcribe only (Japanese .srt)"
	@echo "make translate SRT=...     - translate an existing Japanese .srt"
	@echo "make app                   - launch the desktop app (dev)"
	@echo "make test                  - run CLI + desktop tests"
	@echo "make test-cli              - CLI event-contract tests only"
	@echo "make test-desktop          - desktop tests only"
	@echo ""
	@echo "Pass extra CLI flags via ARGS, e.g. make sub VIDEO=v.mp4 ARGS=\"-w turbo\""

setup:
	cd cli && uv sync
	cd desktop && npm install

sub:
	cd cli && uv run jap-video-sub run "$(VIDEO)" $(ARGS)

transcribe:
	cd cli && uv run jap-video-sub transcribe "$(VIDEO)" $(ARGS)

translate:
	cd cli && uv run jap-video-sub translate "$(SRT)" $(ARGS)

app:
	cd desktop && npm run dev:electron

test: test-cli test-desktop

test-cli:
	cd cli && uv run --with pytest pytest

test-desktop:
	cd desktop && npm test
