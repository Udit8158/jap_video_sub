import { test, expect } from "@playwright/test";

// Drives the real designed UI with the fixture-replay mock (?mock). Verifies the
// full setup → running → done flow and the signature timeline.

test("full flow: pick file, generate, watch timeline, finish", async ({ page }) => {
  await page.goto("/?mock");
  await expect(page.getByTestId("setup")).toBeVisible();

  // Generate is disabled until a file is chosen.
  await expect(page.getByTestId("generate")).toBeDisabled();

  // Pick a file through the hidden input (browser path).
  await page.getByTestId("dropzone").click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "Lecture 12.mp4", mimeType: "video/mp4", buffer: Buffer.from("x") });
  await expect(page.getByTestId("picked-name")).toHaveText("Lecture 12.mp4");

  // Set context + a faster model to exercise the controls.
  await page.getByTestId("notes").fill("Calculus lecture; teacher Tanaka-sensei");
  await page.getByTestId("whisper-model").selectOption("turbo");

  await expect(page.getByTestId("generate")).toBeEnabled();
  await page.getByTestId("generate").click();

  // Running view appears with the timeline and three cells.
  await expect(page.getByTestId("running")).toBeVisible();
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByTestId("cell-1")).toBeVisible();
  await expect(page.getByTestId("cell-3")).toBeVisible();

  // A cell reaches the "done" stage during processing.
  await expect(page.getByTestId("cell-1")).toHaveAttribute("data-stage", "done", {
    timeout: 15_000,
  });

  // Completion (the timeline is intentionally replaced by the result screen).
  await expect(page.getByTestId("done")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("done-output")).toContainText(".en.srt");
  await expect(page.getByTestId("done-lines")).not.toBeEmpty();

  // Back to setup.
  await page.getByTestId("another").click();
  await expect(page.getByTestId("setup")).toBeVisible();
});

test("timeline cell widths reflect real chunk durations", async ({ page }) => {
  await page.goto("/?mock");
  await page.getByTestId("dropzone").click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "x.mp4", mimeType: "video/mp4", buffer: Buffer.from("x") });
  await page.getByTestId("generate").click();
  await expect(page.getByTestId("running")).toBeVisible();

  // Fixture has 3 equal chunks of a 1500s video → roughly equal widths.
  const w1 = await page.getByTestId("cell-1").evaluate((el) => el.getBoundingClientRect().width);
  const w2 = await page.getByTestId("cell-2").evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(w1 - w2)).toBeLessThan(6);
});
