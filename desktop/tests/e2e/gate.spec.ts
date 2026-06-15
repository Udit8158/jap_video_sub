import { test, expect } from "@playwright/test";

// Onboarding gate, driven by the ?needkey in-memory stub so it runs without a
// real Keychain. ?mock keeps the rest of the app on fixture data.
test("api-key gate blocks until a valid key is entered", async ({ page }) => {
  await page.goto("/?mock&needkey");

  // Gate is shown; the main setup screen is not reachable yet.
  await expect(page.getByTestId("gate")).toBeVisible();
  await expect(page.getByTestId("setup")).toHaveCount(0);

  // Rejects an obviously-wrong value.
  await page.getByTestId("key-input").fill("not-a-key");
  await page.getByTestId("key-save").click();
  await expect(page.getByTestId("key-error")).toBeVisible();
  await expect(page.getByTestId("gate")).toBeVisible();

  // Accepts a well-formed key and proceeds into the app.
  await page.getByTestId("key-input").fill("sk-abc123def456");
  await page.getByTestId("key-save").click();
  await expect(page.getByTestId("setup")).toBeVisible();
  await expect(page.getByTestId("gate")).toHaveCount(0);
});

test("no gate when a key is not required (browser mock)", async ({ page }) => {
  await page.goto("/?mock");
  await expect(page.getByTestId("setup")).toBeVisible();
  await expect(page.getByTestId("gate")).toHaveCount(0);
});
