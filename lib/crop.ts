// Pure geometry for the image cropper (app/components/ImageCropper). Kept
// framework-free so the cover-scale / clamp / source-rect math is unit-testable
// without a DOM or canvas. All values are plain numbers in pixel space.

export type Size = { w: number; h: number };
export type CropRect = { sx: number; sy: number; sw: number; sh: number };

// Minimum scale at which an imgW×imgH image fully covers a frameW×frameH window
// (CSS object-fit: cover). At this scale the image exactly fills one axis and
// overflows the other, so there is never an empty gap inside the frame.
export function coverScale(img: Size, frame: Size): number {
  if (img.w <= 0 || img.h <= 0) return 1;
  return Math.max(frame.w / img.w, frame.h / img.h);
}

// Clamp a pan offset (display px, measured from the centered position) so the
// scaled image never reveals a gap inside the frame. `imgDisplay` is the scaled
// image extent on that axis, `frame` the frame extent on the same axis.
export function clampOffset(offset: number, imgDisplay: number, frame: number): number {
  const max = Math.max(0, (imgDisplay - frame) / 2);
  return Math.min(max, Math.max(-max, offset));
}

// Map the visible frame window back to a source-image rectangle for canvas
// drawImage(). `scale` is the effective scale (coverScale × zoom); `offsetX/Y`
// are pan offsets in display px from the centered position. The returned rect is
// clamped into the image bounds to absorb sub-pixel rounding.
export function sourceRect(img: Size, frame: Size, scale: number, offsetX: number, offsetY: number): CropRect {
  const s = scale > 0 ? scale : 1;
  const dispW = img.w * s;
  const dispH = img.h * s;
  const left = (frame.w - dispW) / 2 + offsetX;
  const top = (frame.h - dispH) / 2 + offsetY;
  const sw = frame.w / s;
  const sh = frame.h / s;
  let sx = -left / s;
  let sy = -top / s;
  sx = Math.min(Math.max(0, sx), Math.max(0, img.w - sw));
  sy = Math.min(Math.max(0, sy), Math.max(0, img.h - sh));
  return { sx, sy, sw, sh };
}
