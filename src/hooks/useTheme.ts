import { useSyncExternalStore, useCallback } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "loikka-theme";

// Global theme state - single source of truth
let currentTheme: Theme = getStoredTheme();

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  // Fall back to system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

// Subscribers for useSyncExternalStore
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentTheme;
}

function setGlobalTheme(theme: Theme) {
  currentTheme = theme;
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

// Apply initial theme immediately
applyTheme(currentTheme);

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setTheme = useCallback((newTheme: Theme) => {
    setGlobalTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setGlobalTheme(currentTheme === "light" ? "dark" : "light");
  }, []);

  return { theme, setTheme, toggleTheme };
}
