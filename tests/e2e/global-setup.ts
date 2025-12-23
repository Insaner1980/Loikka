import { tauriMockScript } from "./tauri-mocks";
import { FullConfig } from "@playwright/test";

/**
 * Global setup for Playwright E2E tests.
 * Exports the Tauri mock script for use in tests.
 */
async function globalSetup(_config: FullConfig) {
  // Nothing to do here, we just need the mock script exported
  console.log("[E2E Setup] Tauri mocks ready");
}

export default globalSetup;
export { tauriMockScript };
