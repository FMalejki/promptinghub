"use client";
import { attachmentKind } from "@/lib/attachments";

export type DraftAttachment = { url: string; name?: string };

// Attach-by-URL editor: a list of {url, name} rows the author can add/remove.
// Images preview inline; everything else shows its inferred kind. Binary upload
// is a future enhancement — there's no blob storage yet.
export function AttachmentsField({
  value,
  onChange,
  inputClassName,
  labelClassName,
}: {
  value: DraftAttachment[];
  onChange: (v: DraftAttachment[]) => void;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const rows = value.length ? value : [];

  function update(i: number, patch: Partial<DraftAttachment>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    if (rows.length >= 20) return;
    onChange([...rows, { url: "", name: "" }]);
  }

  return (
    <div>
      <label className={labelClassName}>Attachments (optional)</label>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Link images, PDFs, video or other files an LLM can look at alongside this prompt. Paste a direct URL.
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const url = r.url.trim();
          const kind = url ? attachmentKind(url) : null;
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={r.url}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="https://example.com/diagram.png"
                className={`${inputClassName} flex-1 min-w-[200px]`}
                maxLength={2000}
              />
              <input
                type="text"
                value={r.name ?? ""}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Label (optional)"
                className={`${inputClassName} w-40`}
                maxLength={200}
              />
              {kind && (
                <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
                  {kind}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                remove
              </button>
            </div>
          );
        })}
      </div>
      {rows.length < 20 && (
        <button type="button" onClick={add} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          + Add attachment
        </button>
      )}
    </div>
  );
}
