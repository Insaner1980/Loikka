// Library utilities
export * from "./database";
export * from "./formatters";
export * from "./exportImport";
export * from "./constants";

/**
 * Safely extracts error message from unknown error type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
