import { test as base, expect } from "@playwright/test";
import { tauriMockScript } from "./tauri-mocks";

/**
 * Extended Playwright test with Tauri API mocking.
 * Use this instead of @playwright/test in E2E test files.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Inject Tauri mocks before any navigation
    await page.addInitScript(tauriMockScript);

    // Use the page with mocks injected
    await use(page);
  },
});

export { expect };
