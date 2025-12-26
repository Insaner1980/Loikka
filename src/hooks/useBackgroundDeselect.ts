import { useCallback } from "react";

/**
 * Hook for handling background click to exit selection mode.
 * Returns a click handler that can be attached to a container element.
 * The handler ignores clicks on cards, buttons, selects, and inputs.
 *
 * @param selectionMode - Whether selection mode is active
 * @param onCancel - Callback to cancel selection
 * @returns Click handler for the container
 */
export function useBackgroundDeselect(
  selectionMode: boolean,
  onCancel: () => void
) {
  return useCallback(
    (e: React.MouseEvent) => {
      if (!selectionMode) return;
      const target = e.target as HTMLElement;
      // Ignore clicks on cards, buttons, selects, and inputs
      if (target.closest("[data-card], button, select, input")) return;
      onCancel();
    },
    [selectionMode, onCancel]
  );
}
