"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastVariant = "info" | "success" | "error";
export type ToastAction = { label: string; onClick: () => void };
export type ToastOptions = { variant?: ToastVariant; action?: ToastAction; durationMs?: number };

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  durationMs: number;
};

type ToastContextValue = {
  // Show a toast. Returns the toast id (so callers can dismiss early if needed).
  toast: (message: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// In-app toasts replacing native alert(). Optional action (e.g. "Undo") makes a
// toast actionable; default toasts auto-dismiss. Mounted once in Providers.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, opts?: ToastOptions) => {
      const id = ++idRef.current;
      // Actionable toasts (e.g. Undo) linger longer so the user can react.
      const durationMs = opts?.durationMs ?? (opts?.action ? 7000 : 4000);
      const t: Toast = { id, message, variant: opts?.variant ?? "info", action: opts?.action, durationMs };
      setToasts((prev) => [...prev, t]);
      if (durationMs > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), durationMs),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((h) => clearTimeout(h));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
  success: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/40 text-green-900 dark:text-green-100",
  error: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/40 text-red-900 dark:text-red-100",
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 sm:inset-x-auto sm:right-4 sm:items-end pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto w-full sm:w-auto sm:max-w-sm flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${VARIANT_STYLES[t.variant]}`}
        >
          <span className="text-sm flex-1 min-w-0">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                onDismiss(t.id);
              }}
              className="shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback so a component used outside the provider (e.g. in a unit test)
    // doesn't crash — degrades to a no-op with a console warning.
    return {
      toast: (message: string) => {
        if (typeof console !== "undefined") console.warn("useToast used outside ToastProvider:", message);
        return -1;
      },
      dismiss: () => {},
    };
  }
  return ctx;
}
