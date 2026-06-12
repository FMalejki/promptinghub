"use client";
import { useState } from "react";
import { Markdown } from "../Markdown";

// A textarea with a Write / Preview toggle, so authors can see their README
// rendered exactly as it will appear on the prompt page (GitHub-style markdown)
// before publishing. Controlled — owns only the active tab, not the value.
export function MarkdownField({
  value,
  onChange,
  placeholder,
  maxLength = 20000,
  inputClassName = "",
  minHeightClassName = "min-h-[120px]",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputClassName?: string;
  minHeightClassName?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const tabCls = (active: boolean) =>
    `px-3 py-1 text-xs font-medium rounded-md transition-colors ${
      active
        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    }`;

  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button type="button" onClick={() => setTab("write")} className={tabCls(tab === "write")} aria-pressed={tab === "write"}>
          Write
        </button>
        <button type="button" onClick={() => setTab("preview")} className={tabCls(tab === "preview")} aria-pressed={tab === "preview"}>
          Preview
        </button>
      </div>
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} font-mono ${minHeightClassName}`}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={6}
        />
      ) : (
        <div className={`${minHeightClassName} rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 overflow-auto`}>
          {value.trim() ? (
            <Markdown src={value} />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
