// Theme resolution shared by the pre-paint inline script and the ThemeProvider.
// Kept pure + tiny so the "no flash of wrong theme" logic is unit-testable and
// there is a single source of truth for how we pick light vs dark.

export type Theme = "light" | "dark";

// Resolve the effective theme from a stored preference (localStorage) and the
// OS preference. An explicit stored value wins; otherwise fall back to the OS.
export function resolveTheme(stored: string | null | undefined, prefersDark: boolean): Theme {
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark ? "dark" : "light";
}

// Blocking script injected in <head> so the correct theme class is on <html>
// BEFORE first paint — eliminates the flash of light theme for dark-mode users.
// Mirrors resolveTheme(); inlined as a string because <head> scripts can't import.
export const THEME_INIT_SCRIPT =
  "(function(){try{var s=localStorage.getItem('theme');" +
  "var t=(s==='dark'||s==='light')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
  "if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();";
