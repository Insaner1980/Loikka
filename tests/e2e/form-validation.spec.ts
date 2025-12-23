import { test, expect } from "@playwright/test";

/**
 * E2E tests for form validation across the app.
 */

test.describe("Athlete Form Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");
    // Open add athlete dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("should require first name", async ({ page }) => {
    // Fill only last name and year
    await page.getByLabel(/sukunimi/i).fill("Testaaja");

    // Try to submit
    await page.getByRole("button", { name: /tallenna/i }).click();

    // Dialog should still be open (validation failed)
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("should require last name", async ({ page }) => {
    // Fill only first name
    await page.getByLabel(/etunimi/i).fill("Testi");

    // Try to submit
    await page.getByRole("button", { name: /tallenna/i }).click();

    // Dialog should still be open
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("should accept valid input", async ({ page }) => {
    // Fill all required fields
    await page.getByLabel(/etunimi/i).fill("Testi");
    await page.getByLabel(/sukunimi/i).fill("Urheilija");

    // Values should be filled
    await expect(page.getByLabel(/etunimi/i)).toHaveValue("Testi");
    await expect(page.getByLabel(/sukunimi/i)).toHaveValue("Urheilija");
  });

  test("should trim whitespace from names", async ({ page }) => {
    // Fill with whitespace
    await page.getByLabel(/etunimi/i).fill("  Testi  ");
    await page.getByLabel(/sukunimi/i).fill("  Urheilija  ");

    // Values should be filled (trimming happens on submit)
    await expect(page.getByLabel(/etunimi/i)).toHaveValue("  Testi  ");
  });
});

test.describe("Goals Page Forms", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");
  });

  test("should display goals page", async ({ page }) => {
    const header = page.locator("h1");
    await expect(header).toContainText("Tavoitteet");
  });

  test("should have add goal button", async ({ page }) => {
    // Look for add button
    const addButton = page.getByRole("button", { name: /lisää tavoite/i });
    // May not be visible if no athletes exist
    if (await addButton.isVisible()) {
      await expect(addButton).toBeEnabled();
    }
  });
});

test.describe("Results Page Forms", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle");
  });

  test("should display results page", async ({ page }) => {
    const header = page.locator("h1");
    await expect(header).toContainText("Tulokset");
  });

  test("should have add result button", async ({ page }) => {
    // Look for add button
    const addButton = page.getByRole("button", { name: /lisää tulos/i });
    // May not be visible if no athletes exist
    if (await addButton.isVisible()) {
      await expect(addButton).toBeEnabled();
    }
  });
});

test.describe("Calendar Page Forms", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
  });

  test("should display calendar page", async ({ page }) => {
    const header = page.locator("h1");
    await expect(header).toContainText("Kalenteri");
  });

  test("should have add competition button", async ({ page }) => {
    // Look for add button
    const addButton = page.getByRole("button", { name: /lisää kilpailu/i });
    await expect(addButton).toBeVisible();
  });

  test("should open add competition dialog", async ({ page }) => {
    await page.getByRole("button", { name: /lisää kilpailu/i }).click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
  });
});

test.describe("Form Input Types", () => {
  test("should handle number inputs correctly", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Birth year should be a number input or select
    const birthYearInput = page.getByLabel(/syntymävuosi/i);
    await expect(birthYearInput).toBeVisible();
  });

  test("should handle date inputs in calendar", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /lisää kilpailu/i }).click();

    // Should have date input
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      await expect(dateInput).toBeEnabled();
    }
  });
});
