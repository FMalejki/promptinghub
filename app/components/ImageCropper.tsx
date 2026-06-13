"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { coverScale, clampOffset, sourceRect, type Size } from "@/lib/crop";

// Target aspect + output resolution per upload kind. Cover ≈ 1.91:1 matches the
// OG/social-card frame so the chosen crop is exactly what shows on shares.
const SPEC = {
  cover: { aspect: 1.91, frameW: 360, out: { w: 1280, h: 670 } },
  avatar: { aspect: 1, frameW: 300, out: { w: 512, h: 512 } },
} as const;

// Interactive crop modal: the user pans (drag) and zooms (slider) the image
// inside a fixed-aspect frame, so they see precisely how it will be framed before
// it uploads. On confirm the visible window is rendered to a canvas and handed
// back as a JPEG blob. Pure geometry lives in lib/crop (unit-tested).
export function ImageCropper({
  src,
  kind,
  onCancel,
  onConfirm,
}: {
  src: string;
  kind: "avatar" | "cover";
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const spec = SPEC[kind];
  const frameW = spec.frameW;
  const frameH = Math.round(frameW / spec.aspect);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // Load the source into a detached <img> we can both measure and draw from.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setError("Couldn’t read that image.");
    img.src = src;
  }, [src]);

  const frame: Size = { w: frameW, h: frameH };
  const base = imgSize ? coverScale(imgSize, frame) : 1;
  const scale = base * zoom;
  const dispW = imgSize ? imgSize.w * scale : 0;
  const dispH = imgSize ? imgSize.h * scale : 0;

  // Re-clamp whenever zoom changes so a zoom-out can't leave a gap.
  useEffect(() => {
    if (!imgSize) return;
    setOffset((o) => ({
      x: clampOffset(o.x, imgSize.w * base * zoom, frameW),
      y: clampOffset(o.y, imgSize.h * base * zoom, frameH),
    }));
  }, [zoom, imgSize, base, frameW, frameH]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !imgSize) return;
    const nx = drag.current.ox + (e.clientX - drag.current.px);
    const ny = drag.current.oy + (e.clientY - drag.current.py);
    setOffset({ x: clampOffset(nx, dispW, frameW), y: clampOffset(ny, dispH, frameH) });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const confirm = useCallback(() => {
    const img = imgRef.current;
    if (!img || !imgSize) return;
    setBusy(true);
    try {
      const r = sourceRect(imgSize, frame, scale, offset.x, offset.y);
      const canvas = document.createElement("canvas");
      canvas.width = spec.out.w;
      canvas.height = spec.out.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Couldn’t process the image on this browser.");
        setBusy(false);
        return;
      }
      ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, spec.out.w, spec.out.h);
      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
          else {
            setError("Couldn’t process the image.");
            setBusy(false);
          }
        },
        "image/jpeg",
        0.9,
      );
    } catch {
      setError("Couldn’t process the image.");
      setBusy(false);
    }
  }, [imgSize, frame, scale, offset.x, offset.y, spec.out.w, spec.out.h, onConfirm]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Adjust ${kind}`}>
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Adjust your {kind === "avatar" ? "avatar" : "cover image"}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Drag to reposition, slide to zoom.</p>

        <div className="flex justify-center">
          <div
            className={`relative overflow-hidden bg-gray-100 dark:bg-gray-900 touch-none select-none ${
              kind === "avatar" ? "rounded-full" : "rounded-lg"
            } ${imgSize ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{ width: frameW, height: frameH }}
            onPointerDown={imgSize ? onPointerDown : undefined}
            onPointerMove={imgSize ? onPointerMove : undefined}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imgSize ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  width: dispW,
                  height: dispH,
                  left: (frameW - dispW) / 2 + offset.x,
                  top: (frameH - dispH) / 2 + offset.y,
                  maxWidth: "none",
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">{error || "Loading…"}</div>
            )}
            {/* subtle framing guide */}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-400" aria-hidden="true">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={!imgSize}
            aria-label="Zoom"
            className="flex-1 accent-blue-600"
          />
          <span className="text-xs text-gray-400" aria-hidden="true">+</span>
        </div>

        {error && imgSize && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!imgSize || busy}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
