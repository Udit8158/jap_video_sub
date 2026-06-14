// Round-trips a throwaway secret through the real Keychain and cleans up.
// Uses a unique service name so it never touches the app's actual key.

import assert from "node:assert/strict";
import { getKey, setKey, deleteKey } from "../electron/keychain.js";

const SERVICE = `jap-video-sub-test-${process.pid}`;
const ACCOUNT = "test-account";
const SECRET = "sk-test-" + Math.random().toString(36).slice(2);

try {
  // Starts empty.
  assert.equal(await getKey(SERVICE, ACCOUNT), null, "should start with no key");

  // Store then read back.
  await setKey(SECRET, SERVICE, ACCOUNT);
  assert.equal(await getKey(SERVICE, ACCOUNT), SECRET, "stored key should round-trip");

  // Update in place.
  const SECRET2 = SECRET + "-v2";
  await setKey(SECRET2, SERVICE, ACCOUNT);
  assert.equal(await getKey(SERVICE, ACCOUNT), SECRET2, "key should update in place");

  // Delete.
  await deleteKey(SERVICE, ACCOUNT);
  assert.equal(await getKey(SERVICE, ACCOUNT), null, "key should be gone after delete");

  console.log("✓ keychain round-trip passed (store → read → update → delete)");
} finally {
  await deleteKey(SERVICE, ACCOUNT).catch(() => {});
}
