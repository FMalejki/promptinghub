"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { ToastProvider } from "./components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          {children}
          <CommandPalette />
          <ShortcutsHelp />
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
