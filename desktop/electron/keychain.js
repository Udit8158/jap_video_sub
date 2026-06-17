// macOS Keychain access via the built-in `security` CLI — no native modules to
// compile/rebuild per Electron version, and the secret lands in the real login
// Keychain where the user can inspect or revoke it in Keychain Access.
//
// Pure Node (no electron import) so it's unit-testable on its own.

import { execFile } from "node:child_process";

const SERVICE = "subly";
const ACCOUNT = "openai-api-key";

function run(args) {
  return new Promise((resolve, reject) => {
    execFile("security", args, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        reject(err);
      } else resolve(stdout);
    });
  });
}

/** Return the stored key, or null if none is set. */
export async function getKey(service = SERVICE, account = ACCOUNT) {
  try {
    const out = await run([
      "find-generic-password",
      "-s", service,
      "-a", account,
      "-w", // print only the password
    ]);
    const key = out.replace(/\n$/, "");
    return key || null;
  } catch (err) {
    // Exit 44 = item not found: a normal "no key yet" state, not an error.
    if (err.code === 44 || /could not be found/i.test(err.stderr || "")) return null;
    throw err;
  }
}

/** Store (or replace) the key. `-U` updates in place if it already exists. */
export async function setKey(key, service = SERVICE, account = ACCOUNT) {
  await run([
    "add-generic-password",
    "-s", service,
    "-a", account,
    "-w", key,
    "-U",
  ]);
}

/** Remove the key (best-effort; ignores "not found"). */
export async function deleteKey(service = SERVICE, account = ACCOUNT) {
  try {
    await run(["delete-generic-password", "-s", service, "-a", account]);
  } catch (err) {
    if (err.code !== 44 && !/could not be found/i.test(err.stderr || "")) throw err;
  }
}
