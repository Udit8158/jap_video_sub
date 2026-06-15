// Abstraction over API-key storage so the onboarding gate is testable.
//   · Electron  → real Keychain via window.jvs
//   · ?needkey  → in-memory stub (browser demo + Playwright)
//   · otherwise → not required (browser mock needs no key)

export interface KeyApi {
  required: boolean;
  has: () => Promise<boolean>;
  set: (key: string) => Promise<void>;
}

export function makeKeyApi(): KeyApi {
  if (typeof window !== "undefined" && window.jvs?.hasApiKey && window.jvs.setApiKey) {
    const jvs = window.jvs;
    return {
      required: true,
      has: () => jvs.hasApiKey!(),
      set: (k) => jvs.setApiKey!(k),
    };
  }

  const forceGate =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("needkey");
  if (forceGate) {
    let stored = "";
    return {
      required: true,
      has: async () => stored.length > 0,
      set: async (k) => {
        stored = k;
      },
    };
  }

  return { required: false, has: async () => true, set: async () => {} };
}
