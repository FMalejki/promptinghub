"use client";
import { useEffect, useState } from "react";
import { isLikelyImageUrl } from "@/lib/imageUrl";

// Cover-image URL input with a "doesn't look like a direct image" warning and a
// live thumbnail preview (hidden if the URL fails to load). Warns only — never
// blocks submit; a placeholder is used downstream when the image is missing/bad.
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
  useEffect(() => setBroken(false), [value]);

  const trimmed = value.trim();
  const looksOk = isLikelyImageUrl(trimmed);

  return (
    <div>
      <label className={labelClassName}>Cover Image URL (optional)</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
        placeholder="https://example.com/image.jpg"
      />
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
