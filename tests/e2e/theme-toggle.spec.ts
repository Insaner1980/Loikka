import { test, expect } from "@playwright/test";

/**
 * E2E tests for theme toggle functionality.
 */

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto("/settings");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("should display settings page header", async ({ page }) => {
    const header = page.locator("h1");
    await expect(header).toContainText("Asetukset");
  });

  test("should have theme section", async ({ page }) => {
    // Look for theme section
    await expect(page.getByText("Teema")).toBeVisible();
    await expect(page.getByText("Valitse sovelluksen ulkoasu")).toBeVisible();
  });

  test("should have theme toggle buttons", async ({ page }) => {
    // Look for light/dark theme buttons
    await expect(page.getByRole("button", { name: "Vaalea" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tumma" })).toBeVisible();
  });

  test("should switch to light theme", async ({ page }) => {
    // Click light theme button
    await page.getByRole("button", { name: "Vaalea" }).click();

    // Check that HTML has light class or dark class is removed
    const html = page.locator("html");
    await expect(html).toHaveClass(/light/);
  });

  test("should switch to dark theme", async ({ page }) => {
    // First switch to light to ensure we can switch to dark
    await page.getByRole("button", { name: "Vaalea" }).click();
    await page.waitForTimeout(100);

    // Click dark theme button
    await page.getByRole("button", { name: "Tumma" }).click();

    // Check that HTML has dark class
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });

  test("should persist theme preference", async ({ page }) => {
    // Switch to light theme
    await page.getByRole("button", { name: "Vaalea" }).click();

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that theme is still light
    const html = page.locator("html");
    await expect(html).toHaveClass(/light/);
  });

  test("should store theme in localStorage", async ({ page }) => {
    // Switch to light theme
    await page.getByRole("button", { name: "Vaalea" }).click();

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem("loikka-theme"));
    expect(theme).toBe("light");
  });
});

test.describe("Settings Page - Data Section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
  });

  test("should have export button", async ({ page }) => {
    await expect(page.getByText("Vie tiedot")).toBeVisible();
    await expect(
      page.getByText("Tallenna kaikki tiedot JSON-tiedostoon")
    ).toBeVisible();
  });

  test("should have import button", async ({ page }) => {
    await expect(page.getByText("Tuo tiedot")).toBeVisible();
    await expect(
      page.getByText("Lataa tiedot JSON-tiedostosta")
    ).toBeVisible();
  });
});

test.describe("Visual Theme Changes", () => {
  test("should change background color when switching themes", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Get initial background color
    const initialBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    // Switch theme
    const currentTheme = await page.evaluate(() =>
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );

    if (currentTheme === "dark") {
      await page.getByRole("button", { name: "Vaalea" }).click();
    } else {
      await page.getByRole("button", { name: "Tumma" }).click();
    }

    await page.waitForTimeout(200);

    // Get new background color
    const newBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    // Background colors should be different
    expect(newBg).not.toBe(initialBg);
  });
});
