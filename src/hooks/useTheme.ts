// Theme hook - dark theme only (light theme removed)
// Kept for backward compatibility with components that import useTheme

export function useTheme() {
  return {
    theme: "dark" as const,
    setTheme: () => {}, // No-op, dark theme only
    toggleTheme: () => {}, // No-op, dark theme only
  };
}
