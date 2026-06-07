"use client";
import { useState } from "react";
import { getPlaceholderImage } from "@/lib/constants";

// A cover <img> that falls back to a deterministic placeholder if the source
// fails to load (broken/expired URL), so a card never shows a broken image.
export function CoverImage({ src, seed, className }: { src: string; seed: string; className?: string }) {
  const [current, setCurrent] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      loading="lazy"
      onError={() => setCurrent(getPlaceholderImage(seed))}
      className={className}
    />
  );
}
