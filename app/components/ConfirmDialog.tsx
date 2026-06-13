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

export type PromptOptions = {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;
type PromptFn = (opts: PromptOptions | string) => Promise<string | null>;

type DialogContextValue = { confirm: ConfirmFn; promptInput: PromptFn };

const DialogContext = createContext<DialogContextValue | null>(null);

type ConfirmPending = { kind: "confirm" } & ConfirmOptions & { resolve: (ok: boolean) => void };
type InputPending = { kind: "input" } & PromptOptions & { resolve: (val: string | null) => void };
type Pending = ConfirmPending | InputPending;

// Promise-based confirm + text-input modals replacing native window.confirm() /
// window.prompt(). Callers do `await confirm({ message, variant: "danger" })` or
// `const name = await promptInput({ message: "Folder name" })` (null = cancelled).
// Mounted once in Providers; only one dialog shows at a time (last call wins).
// Styled to match the app (light/dark), Esc cancels, backdrop cancels.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized = typeof opts === "string" ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => {
      setPending((prev) => {
        // Resolve any still-open dialog so its awaiter never hangs.
        if (prev) prev.kind === "confirm" ? prev.resolve(false) : prev.resolve(null);
        return { kind: "confirm", ...normalized, resolve };
      });
    });
  }, []);

  const promptInput = useCallback<PromptFn>((opts) => {
    const normalized = typeof opts === "string" ? { message: opts } : opts;
    return new Promise<string | null>((resolve) => {
      setPending((prev) => {
        if (prev) prev.kind === "confirm" ? prev.resolve(false) : prev.resolve(null);
        return { kind: "input", ...normalized, resolve };
      });
    });
  }, []);

  const settleConfirm = useCallback((ok: boolean) => {
    setPending((p) => {
      if (p?.kind === "confirm") p.resolve(ok);
      return null;
    });
  }, []);

  const settleInput = useCallback((val: string | null) => {
    setPending((p) => {
      if (p?.kind === "input") p.resolve(val);
      return null;
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, promptInput }}>
      {children}
      {pending?.kind === "confirm" && (
        <ConfirmModal pending={pending} onCancel={() => settleConfirm(false)} onConfirm={() => settleConfirm(true)} />
      )}
      {pending?.kind === "input" && (
        <InputModal pending={pending} onCancel={() => settleInput(null)} onSubmit={(v) => settleInput(v)} />
      )}
    </DialogContext.Provider>
  );
}

function ConfirmModal({ pending, onCancel, onConfirm }: { pending: ConfirmPending; onCancel: () => void; onConfirm: () => void }) {
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
    <ModalShell title={pending.title || "Confirm"} onBackdrop={onCancel}>
      {pending.title && <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{pending.title}</h2>}
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
    </ModalShell>
  );
}

function InputModal({ pending, onCancel, onSubmit }: { pending: InputPending; onCancel: () => void; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(pending.defaultValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => onSubmit(value);
  return (
    <ModalShell title={pending.title || pending.message || "Input"} onBackdrop={onCancel}>
      {pending.title && <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{pending.title}</h2>}
      {pending.message && <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line mb-3">{pending.message}</p>}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={pending.placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {pending.cancelLabel || "Cancel"}
        </button>
        <button
          onClick={submit}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
        >
          {pending.confirmLabel || "OK"}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onBackdrop, children }: { title: string; onBackdrop: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onBackdrop} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
        {children}
      </div>
    </div>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    // Fallback to native confirm outside the provider (e.g. in a unit test).
    return (opts) =>
      Promise.resolve(
        typeof window !== "undefined" ? window.confirm(typeof opts === "string" ? opts : opts.message) : true,
      );
  }
  return ctx.confirm;
}

export function usePrompt(): PromptFn {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    // Fallback to native prompt outside the provider.
    return (opts) =>
      Promise.resolve(
        typeof window !== "undefined"
          ? window.prompt(typeof opts === "string" ? opts : opts.message || "", typeof opts === "string" ? "" : opts.defaultValue || "")
          : null,
      );
  }
  return ctx.promptInput;
}
