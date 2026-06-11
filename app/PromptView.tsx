"use client";
import { useState } from "react";
import { COPY_FEEDBACK_MS, copyLabel } from "@/lib/clipboard";

export function CopyButton({
  text,
  label = "Copy",
  onCopy,
  variant = "default",
}: {
  text: string;
  label?: string;
  onCopy?: () => void;
  variant?: "default" | "primary";
}) {
  const [copied, setCopied] = useState(false);
  // primary = the main "Copy prompt" CTA (clipboard is the robust way to run a
  // prompt in any assistant); default = secondary copies (per-file, install line).
  const cls =
    variant === "primary"
      ? "text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 shrink-0"
      : "text-xs bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded px-3 py-1 shrink-0";
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      }}
      className={cls}
    >
      {copyLabel(copied, label)}
    </button>
  );
}
