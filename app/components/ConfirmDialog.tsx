"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ConfirmVariant = "default" | "danger";
export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

// Promise-based confirmation modal replacing native window.confirm(). A caller
// does `if (!(await confirm({ message, variant: "danger" }))) return;`. Mounted
// once in Providers; only one dialog is shown at a time (last call wins). Styled
// to match the app (light/dark), Esc cancels, Enter confirms, backdrop cancels.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized = typeof opts === "string" ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => {
      // If a prior dialog is somehow still open, resolve it false first so its
      // awaiter never hangs.
      setPending((prev) => {
        prev?.resolve(false);
        return { ...normalized, resolve };
      });
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmModal pending={pending} onCancel={() => settle(false)} onConfirm={() => settle(true)} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({ pending, onCancel, onConfirm }: { pending: Pending; onCancel: () => void; onConfirm: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  const danger = pending.variant === "danger";
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={pending.title || "Confirm"}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
        {pending.title && (
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{pending.title}</h2>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{pending.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {pending.cancelLabel || "Cancel"}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {pending.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to native confirm outside the provider (e.g. in a unit test) so a
    // component doesn't crash — keeps the same Promise<boolean> contract.
    return (opts) =>
      Promise.resolve(
        typeof window !== "undefined" ? window.confirm(typeof opts === "string" ? opts : opts.message) : true,
      );
  }
  return ctx;
}
