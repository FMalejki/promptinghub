"use client";
import { useState } from "react";
import { COPY_FEEDBACK_MS, copyLabel } from "@/lib/clipboard";

export function CopyButton({ text, label = "Copy", onCopy }: { text: string; label?: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      }}
      className="text-xs bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded px-3 py-1 shrink-0"
    >
      {copyLabel(copied, label)}
    </button>
  );
}
