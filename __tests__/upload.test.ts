import { validateImageUpload, uploadObjectPath, MAX_IMAGE_BYTES } from "../lib/upload";

describe("validateImageUpload", () => {
  it("accepts png/jpeg/webp/gif under the size cap", () => {
    expect(validateImageUpload("image/png", 1000)).toEqual({ ok: true, ext: "png" });
    expect(validateImageUpload("image/jpeg", 1000)).toEqual({ ok: true, ext: "jpg" });
    expect(validateImageUpload("image/webp", 1000)).toEqual({ ok: true, ext: "webp" });
    expect(validateImageUpload("image/gif", 1000)).toEqual({ ok: true, ext: "gif" });
  });

  it("strips charset params and is case-insensitive", () => {
    expect(validateImageUpload("IMAGE/PNG; charset=binary", 1000)).toEqual({ ok: true, ext: "png" });
  });

  it("rejects SVG and other types (XSS / unsupported)", () => {
    expect(validateImageUpload("image/svg+xml", 1000).ok).toBe(false);
    expect(validateImageUpload("text/html", 1000).ok).toBe(false);
    expect(validateImageUpload("application/pdf", 1000).ok).toBe(false);
    expect(validateImageUpload(null, 1000).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(validateImageUpload("image/png", 0).ok).toBe(false);
    expect(validateImageUpload("image/png", MAX_IMAGE_BYTES + 1).ok).toBe(false);
    expect(validateImageUpload("image/png", MAX_IMAGE_BYTES)).toEqual({ ok: true, ext: "png" });
  });
});

describe("uploadObjectPath", () => {
  it("scopes by kind and sanitizes the random token", () => {
    expect(uploadObjectPath("avatar", "png", "abc123")).toBe("avatars/abc123.png");
    expect(uploadObjectPath("cover", "jpg", "a/b.c-d")).toBe("covers/abcd.jpg");
  });

  it("never produces an empty token", () => {
    expect(uploadObjectPath("avatar", "png", "")).toBe("avatars/x.png");
    expect(uploadObjectPath("avatar", "png", "!!!")).toBe("avatars/x.png");
  });
});
