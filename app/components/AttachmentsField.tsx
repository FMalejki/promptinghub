"use client";
import { useEffect, useRef, useState } from "react";
import { attachmentKind } from "@/lib/attachments";

export type DraftAttachment = { url: string; name?: string };

// Attach editor: a list of {url, name} rows the author can add/remove. Files can
// be added by direct URL OR uploaded from the device (when blob storage is
// configured — the upload control probes /api/upload and hides itself otherwise,
// so the URL path always works). Images preview their kind inline.
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
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/upload")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => active && setConfigured(!!d.configured))
      .catch(() => active && setConfigured(false));
    return () => {
      active = false;
    };
  }, []);

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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (rows.length >= 20) {
      setError("You can attach at most 20 files.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "attachment");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Upload failed.");
        return;
      }
      if (data?.url) onChange([...rows, { url: data.url, name: data.name || file.name }]);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className={labelClassName}>Attachments (optional)</label>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Add images, PDFs, video or other files an LLM can look at alongside this prompt — paste a direct URL
        {configured ? " or upload from your device" : ""}.
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
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {rows.length < 20 && (
          <button type="button" onClick={add} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            + Add attachment
          </button>
        )}
        {configured && rows.length < 20 && (
          <>
            <input
              ref={fileRef}
              type="file"
              onChange={onFile}
              className="hidden"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json,text/yaml,application/zip,.doc,.docx,.xls,.xlsx,audio/mpeg,audio/wav,video/mp4,video/webm"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:underline disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {busy ? "Uploading…" : "Upload a file"}
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
