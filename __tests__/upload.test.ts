import { validateImageUpload, validateFileUpload, uploadObjectPath, uploadFilePath, resolveBlobToken, MAX_IMAGE_BYTES, MAX_FILE_BYTES } from "../lib/upload";

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

describe("validateFileUpload", () => {
  it("accepts safe document/data/media types", () => {
    expect(validateFileUpload("application/pdf", 1000)).toEqual({ ok: true, ext: "pdf" });
    expect(validateFileUpload("text/markdown", 1000)).toEqual({ ok: true, ext: "md" });
    expect(validateFileUpload("application/json", 1000)).toEqual({ ok: true, ext: "json" });
    expect(validateFileUpload("text/csv", 1000)).toEqual({ ok: true, ext: "csv" });
    expect(validateFileUpload("application/zip", 1000)).toEqual({ ok: true, ext: "zip" });
    expect(validateFileUpload("video/mp4", 1000)).toEqual({ ok: true, ext: "mp4" });
    expect(validateFileUpload("image/png", 1000)).toEqual({ ok: true, ext: "png" });
  });

  it("rejects executables, scripts, html and svg (allow-list)", () => {
    expect(validateFileUpload("application/x-msdownload", 1000).ok).toBe(false); // .exe
    expect(validateFileUpload("application/x-sh", 1000).ok).toBe(false); // shell
    expect(validateFileUpload("text/html", 1000).ok).toBe(false); // XSS
    expect(validateFileUpload("application/javascript", 1000).ok).toBe(false);
    expect(validateFileUpload("image/svg+xml", 1000).ok).toBe(false); // XSS
    expect(validateFileUpload(null, 1000).ok).toBe(false);
  });

  it("enforces the 4.5 MB Vercel server-upload cap and rejects empties", () => {
    expect(validateFileUpload("application/pdf", 0).ok).toBe(false);
    expect(validateFileUpload("application/pdf", MAX_FILE_BYTES + 1).ok).toBe(false);
    expect(validateFileUpload("application/pdf", MAX_FILE_BYTES)).toEqual({ ok: true, ext: "pdf" });
  });

  it("strips charset params and is case-insensitive", () => {
    expect(validateFileUpload("APPLICATION/PDF; charset=binary", 1000)).toEqual({ ok: true, ext: "pdf" });
  });
});

describe("uploadFilePath", () => {
  it("scopes under attachments/ and sanitizes token + ext", () => {
    expect(uploadFilePath("pdf", "abc123")).toBe("attachments/abc123.pdf");
    expect(uploadFilePath("p!d/f", "a/b.c")).toBe("attachments/abc.pdf");
  });
  it("never produces an empty token or ext", () => {
    expect(uploadFilePath("", "")).toBe("attachments/x.bin");
  });
});

describe("resolveBlobToken", () => {
  it("prefers the public store's prefixed token (multiple stores connected)", () => {
    expect(resolveBlobToken({ BLOB_PUBLIC_READ_WRITE_TOKEN: "pub", BLOB_READ_WRITE_TOKEN: "plain" })).toBe("pub");
  });
  it("falls back to the unprefixed token", () => {
    expect(resolveBlobToken({ BLOB_READ_WRITE_TOKEN: "plain" })).toBe("plain");
  });
  it("returns empty string when neither is set (uploads disabled)", () => {
    expect(resolveBlobToken({})).toBe("");
  });
});
