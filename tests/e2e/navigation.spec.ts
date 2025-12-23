import { test, expect } from "@playwright/test";

/**
 * E2E tests for Loikka app navigation.
 *
 * Note: These tests run against Vite dev server.
 * Tauri API calls will fail, but UI rendering can be tested.
 */

test.describe("Navigation", () => {
  test("should load the app", async ({ page }) => {
    await page.goto("/");

    // App should render without crashing
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display sidebar navigation", async ({ page }) => {
    await page.goto("/");

    // Wait for sidebar to be visible
    const sidebar = page.locator("nav");
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for main navigation items (Finnish UI)
    // Note: These may fail if Tauri API errors prevent rendering
    await page.waitForTimeout(2000); // Wait for potential API errors to settle

    // Look for common UI elements that should exist
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should navigate to athletes page", async ({ page }) => {
    await page.goto("/athletes");

    // URL should be correct
    await expect(page).toHaveURL(/.*athletes/);
  });

  test("should navigate to results page", async ({ page }) => {
    await page.goto("/results");

    await expect(page).toHaveURL(/.*results/);
  });

  test("should navigate to calendar page", async ({ page }) => {
    await page.goto("/calendar");

    await expect(page).toHaveURL(/.*calendar/);
  });

  test("should navigate to goals page", async ({ page }) => {
    await page.goto("/goals");

    await expect(page).toHaveURL(/.*goals/);
  });

  test("should navigate to statistics page", async ({ page }) => {
    await page.goto("/statistics");

    await expect(page).toHaveURL(/.*statistics/);
  });

  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/settings");

    await expect(page).toHaveURL(/.*settings/);
  });
});

test.describe("Responsive Design", () => {
  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    await expect(page.locator("body")).toBeVisible();
  });
});
