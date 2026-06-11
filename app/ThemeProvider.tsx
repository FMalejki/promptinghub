"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Theme } from "@/lib/theme";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The pre-paint script in <head> (THEME_INIT_SCRIPT) has already put the correct
  // class on <html> before React runs, so there is no flash. We start "light" to
  // match the server-rendered HTML (no hydration mismatch) and sync from the DOM
  // class on mount. We always render children so pages are server-rendered — never
  // a blank page gated on a mount flag.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Read the class the pre-paint script set; do NOT mutate it here (mutating in a
    // passive effect could briefly remove .dark and reintroduce a flash).
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
