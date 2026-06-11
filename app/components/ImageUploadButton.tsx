"use client";
import { useEffect, useRef, useState } from "react";

// Small "Upload" control next to an image-URL field. Probes /api/upload on mount
// and renders nothing when storage isn't configured (the URL field stays the only
// path — graceful degradation). On success it calls onUploaded(publicUrl).
export function ImageUploadButton({
  kind,
  onUploaded,
}: {
  kind: "avatar" | "cover";
  onUploaded: (url: string) => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Upload failed.");
        return;
      }
      if (data?.url) onUploaded(data.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (configured === null || configured === false) return null; // probing or unavailable → URL-only

  return (
    <div className="mt-2">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {busy ? "Uploading…" : "Upload from device"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
