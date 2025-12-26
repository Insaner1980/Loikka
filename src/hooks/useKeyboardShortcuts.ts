import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Navigation shortcuts (1-8) - call only in Layout
export function useNavigationShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Navigation shortcuts (no modifiers needed)
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case "1":
            navigate("/");
            break;
          case "2":
            navigate("/athletes");
            break;
          case "3":
            navigate("/results");
            break;
          case "4":
            navigate("/calendar");
            break;
          case "5":
            navigate("/statistics");
            break;
          case "6":
            navigate("/goals");
            break;
          case "7":
            navigate("/photos");
            break;
          case "8":
            navigate("/settings");
            break;
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Add shortcut (Ctrl+U) - call in pages with "Lisää" button
export function useAddShortcut(onAdd: () => void) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+U: Uusi (new)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        onAdd();
      }
    },
    [onAdd]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Escape key handler - for exiting modes, closing panels, etc.
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && enabled) {
        e.preventDefault();
        onEscape();
      }
    },
    [onEscape, enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Calendar-specific keyboard navigation
export function useCalendarKeyboard(
  onPrevMonth: () => void,
  onNextMonth: () => void,
  onToday: () => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onPrevMonth();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNextMonth();
          break;
        case "t":
        case "T":
          e.preventDefault();
          onToday();
          break;
      }
    },
    [onPrevMonth, onNextMonth, onToday]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
