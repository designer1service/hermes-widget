/**
 * Apply 'light' class on :root for theme switching.
 * Dark is the default (:root); light mode adds the .light class.
 * Persists choice in localStorage. Defaults to dark.
 */
export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "hermes-widget-theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
  localStorage.setItem(STORAGE_KEY, mode);
}
