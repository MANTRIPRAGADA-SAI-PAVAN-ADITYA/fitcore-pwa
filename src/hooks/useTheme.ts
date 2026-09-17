import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "fitjourney:theme";

function applyTheme(pref: ThemePreference) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = pref === "dark" || (pref === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme(): [ThemePreference, (pref: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    applyTheme(pref);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (pref === "system") applyTheme("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [pref]);

  const update = useCallback((next: ThemePreference) => {
    setPref(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode / blocked) — theme just won't persist.
    }
  }, []);

  return [pref, update];
}
