export type ThemePreference = "system" | "light" | "dark";

const storageKey = "hamsTheme";

function resolvedTheme(theme: ThemePreference) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(theme: ThemePreference) {
  localStorage.setItem(storageKey, theme);
  document.documentElement.dataset.theme = resolvedTheme(theme);
}

export function getSavedTheme(): ThemePreference {
  const saved = localStorage.getItem(storageKey);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

export function setupTheme() {
  applyTheme(getSavedTheme());
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystemTheme = () => {
    if (getSavedTheme() === "system") applyTheme("system");
  };
  media.addEventListener?.("change", syncSystemTheme);
  return () => media.removeEventListener?.("change", syncSystemTheme);
}
