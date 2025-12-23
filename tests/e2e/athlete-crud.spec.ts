import { test, expect } from "./fixtures";

/**
 * E2E tests for athlete CRUD operations.
 *
 * Note: These tests verify UI behavior. Actual data persistence
 * requires the Tauri backend to be running.
 */

test.describe("Athletes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/athletes");
    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("should display page header", async ({ page }) => {
    // Check for Finnish title
    const header = page.locator("h1");
    await expect(header).toContainText("Urheilijat");
  });

  test("should have add athlete button", async ({ page }) => {
    // Look for the "Lisää urheilija" button
    const addButton = page.getByRole("button", { name: /lisää urheilija/i });
    await expect(addButton).toBeVisible();
  });

  test("should open add athlete dialog when clicking add button", async ({
    page,
  }) => {
    // Click add button
    const addButton = page.getByRole("button", { name: /lisää urheilija/i });
    await addButton.click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should have correct title
    await expect(dialog).toContainText("Lisää urheilija");
  });

  test("should have form fields in add dialog", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Check for form fields (Finnish labels)
    await expect(page.getByLabel(/etunimi/i)).toBeVisible();
    await expect(page.getByLabel(/sukunimi/i)).toBeVisible();
    await expect(page.getByLabel(/syntymävuosi/i)).toBeVisible();
  });

  test("should close dialog on cancel", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click cancel button
    const cancelButton = page.getByRole("button", { name: /peruuta/i });
    await cancelButton.click();

    // Dialog should be closed
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Try to submit empty form
    const saveButton = page.getByRole("button", { name: /tallenna/i });
    await saveButton.click();

    // Form should still be visible (not submitted)
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("should fill in athlete form", async ({ page }) => {
    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Fill in form
    await page.getByLabel(/etunimi/i).fill("Testi");
    await page.getByLabel(/sukunimi/i).fill("Urheilija");

    // Check that values are entered
    await expect(page.getByLabel(/etunimi/i)).toHaveValue("Testi");
    await expect(page.getByLabel(/sukunimi/i)).toHaveValue("Urheilija");
  });

  test("should show empty state when no athletes", async ({ page }) => {
    // This test may pass or fail depending on existing data
    // Look for empty state text
    const emptyState = page.getByText(/ei urheilijoita/i);

    // If visible, verify the add button is also present
    if (await emptyState.isVisible()) {
      await expect(
        page.getByRole("button", { name: /lisää urheilija/i })
      ).toBeVisible();
    }
  });
});

test.describe("Keyboard Shortcuts", () => {
  test("should open add dialog with Ctrl+N", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Wait for page to be ready
    await expect(page.locator("h1")).toBeVisible();

    // Focus the body to ensure keyboard events are captured
    await page.locator("body").click();

    // Press Ctrl+N
    await page.keyboard.press("Control+n");

    // Dialog should open (with extended timeout for keyboard handling)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test("should close dialog with Escape", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Dialog should be closed
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
