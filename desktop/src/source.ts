// Picks the right EventSource for the environment: the real Electron bridge when
// it's present, otherwise the fixture-replay mock (browser dev + Playwright).
// A URL param ?mock forces the mock even inside Electron (handy for demos).

import { ElectronEventSource, hasElectronBridge } from "./eventsource/electron";
import { MockEventSource } from "./eventsource/mock";
import type { EventSource } from "./eventsource/types";

export function makeSource(): EventSource {
  const forceMock =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("mock");
  if (!forceMock && hasElectronBridge()) return new ElectronEventSource();
  return new MockEventSource();
}

export const isMock = (): boolean => !hasElectronBridge();
