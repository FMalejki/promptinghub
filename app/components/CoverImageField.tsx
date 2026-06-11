"use client";
import { useEffect, useState } from "react";
import { isLikelyImageUrl } from "@/lib/imageUrl";
import { ImageUploadButton } from "./ImageUploadButton";

// Cover-image field: upload-from-device is the primary action; the raw URL input
// is tucked behind a toggle so it doesn't dominate. A live thumbnail preview +
// "doesn't look like a direct image" warning still apply to whatever URL is set
// (uploaded or pasted). Warns only — never blocks submit.
export function CoverImageField({
  value,
  onChange,
  inputClassName,
  labelClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  useEffect(() => setBroken(false), [value]);

  const trimmed = value.trim();
  const looksOk = isLikelyImageUrl(trimmed);

  return (
    <div>
      <label className={labelClassName}>Cover Image (optional)</label>
      <ImageUploadButton kind="cover" onUploaded={onChange} />
      {!showUrl ? (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="mt-2 block text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          or paste an image URL
        </button>
      ) : (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} mt-2`}
          placeholder="https://example.com/image.jpg"
          autoFocus
        />
      )}
      {trimmed && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 ml-3 inline text-xs text-gray-400 hover:text-red-600"
        >
          remove
        </button>
      )}
      {trimmed && !looksOk && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          This doesn’t look like a direct image link (e.g. ending in .png/.jpg). Album or page URLs (like
          imgur.com/a/…) won’t display — a placeholder will be used instead.
        </p>
      )}
      {trimmed && looksOk && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt="Cover preview"
          onError={() => setBroken(true)}
          className="mt-2 h-28 w-auto max-w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
        />
      )}
      {trimmed && looksOk && broken && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Couldn’t load that image — double-check the URL.</p>
      )}
    </div>
  );
}
