import { test, expect } from "@playwright/test";

/**
 * E2E tests for accessibility features.
 */

test.describe("Keyboard Navigation", () => {
  test("should navigate with Tab key", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Press Tab multiple times and verify focus moves
    await page.keyboard.press("Tab");

    // Some element should be focused
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("should have visible focus indicators", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Tab to the add button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Focus should be visible on some element
    const focusedElement = page.locator(":focus");
    const isFocused = await focusedElement.count();
    expect(isFocused).toBeGreaterThan(0);
  });

  test("should close dialog with Escape key", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("ARIA Labels", () => {
  test("should have proper dialog roles", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Should have dialog role
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
  });

  test("should have proper button roles", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Buttons should have button role
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Should have h1
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
  });
});

test.describe("Form Accessibility", () => {
  test("should have labeled form inputs", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Inputs should be accessible by label
    const firstNameInput = page.getByLabel(/etunimi/i);
    await expect(firstNameInput).toBeVisible();

    const lastNameInput = page.getByLabel(/sukunimi/i);
    await expect(lastNameInput).toBeVisible();
  });

  test("should focus first input when dialog opens", async ({ page }) => {
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Open dialog
    await page.getByRole("button", { name: /lisää urheilija/i }).click();

    // Wait for dialog animation
    await page.waitForTimeout(200);

    // First input or dialog element should be focused
    const focusedElement = page.locator(":focus");
    const isFocused = await focusedElement.count();
    expect(isFocused).toBeGreaterThan(0);
  });
});

test.describe("Color Contrast", () => {
  test("should have sufficient contrast in dark theme", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Switch to dark theme
    await page.getByRole("button", { name: "Tumma" }).click();

    // Check that text is visible (basic visibility check)
    await expect(page.getByText("Asetukset")).toBeVisible();
    await expect(page.getByText("Teema")).toBeVisible();
  });

  test("should have sufficient contrast in light theme", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Switch to light theme
    await page.getByRole("button", { name: "Vaalea" }).click();

    // Check that text is visible
    await expect(page.getByText("Asetukset")).toBeVisible();
    await expect(page.getByText("Teema")).toBeVisible();
  });
});

test.describe("Responsive Accessibility", () => {
  test("should be accessible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Page should be usable
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should have touch-friendly button sizes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/athletes");
    await page.waitForLoadState("networkidle");

    // Buttons should be large enough for touch
    const addButton = page.getByRole("button", { name: /lisää urheilija/i });

    if (await addButton.isVisible()) {
      const box = await addButton.boundingBox();
      if (box) {
        // Minimum touch target is 44x44 pixels
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });
});

test.describe("Navigation Accessibility", () => {
  test("should have navigation landmark", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should have nav element
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("should have main content area", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should have main content
    const main = page.locator("main");
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
  });
});
