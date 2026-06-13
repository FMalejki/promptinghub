"use client";
import { useState } from "react";
import { COPY_FEEDBACK_MS } from "@/lib/clipboard";

// Share affordance for PRIVATE prompts. Public prompts get the full social/embed
// ShareButtons; a private prompt can't be shared publicly, so this copies the
// direct link and makes the access rule explicit: only people on the prompt's
// share list (set by the owner in Edit) can actually open it.
export function PrivateShareButton({ canManage }: { canManage?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copyLink}
      title={
        canManage
          ? "Copy a private link. Only people you've shared this with (manage access in Edit) can open it."
          : "Copy a private link. Only people the owner has shared this with can open it."
      }
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
      <span>{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
