"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            {children}
            <CommandPalette />
            <ShortcutsHelp />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
