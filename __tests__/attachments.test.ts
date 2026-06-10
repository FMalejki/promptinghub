import { attachmentKind, normalizeAttachments, attachmentLabel } from "../lib/attachments";

describe("attachmentKind", () => {
  it("classifies by file extension (ignoring query strings)", () => {
    expect(attachmentKind("https://x.com/a/diagram.png")).toBe("image");
    expect(attachmentKind("https://x.com/clip.mp4?t=10")).toBe("video");
    expect(attachmentKind("https://x.com/audio.mp3")).toBe("audio");
    expect(attachmentKind("https://x.com/spec.pdf")).toBe("pdf");
    expect(attachmentKind("https://x.com/notes.md")).toBe("doc");
  });
  it("recognizes data URIs", () => {
    expect(attachmentKind("data:image/png;base64,AAAA")).toBe("image");
    expect(attachmentKind("data:video/mp4;base64,AAAA")).toBe("video");
  });
  it("treats extensionless image CDNs as images", () => {
    expect(attachmentKind("https://images.unsplash.com/photo-123")).toBe("image");
  });
  it("falls back to other for unknown/empty", () => {
    expect(attachmentKind("https://x.com/page")).toBe("other");
    expect(attachmentKind("")).toBe("other");
  });
});

describe("normalizeAttachments", () => {
  it("keeps valid http(s) urls, trims, and drops blanks/dupes", () => {
    const out = normalizeAttachments([
      { url: "  https://x.com/a.png  ", name: "  Diagram  " },
      { url: "https://x.com/a.png" }, // dupe
      { url: "" }, // blank
      { url: "ftp://x.com/bad" }, // wrong protocol
      { name: "no url" },
    ]);
    expect(out).toEqual([{ url: "https://x.com/a.png", name: "Diagram" }]);
  });
  it("accepts data URIs and omits empty names", () => {
    const out = normalizeAttachments([{ url: "data:image/png;base64,AAAA", name: "  " }]);
    expect(out).toEqual([{ url: "data:image/png;base64,AAAA" }]);
  });
  it("returns [] for non-array / junk input", () => {
    expect(normalizeAttachments(null)).toEqual([]);
    expect(normalizeAttachments("nope")).toEqual([]);
    expect(normalizeAttachments([1, "x", null])).toEqual([]);
  });
  it("caps the number of attachments", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ url: `https://x.com/${i}.png` }));
    expect(normalizeAttachments(many).length).toBe(20);
  });
});

describe("attachmentLabel", () => {
  it("uses the name when present", () => {
    expect(attachmentLabel({ url: "https://x.com/a.png", name: "Diagram" })).toBe("Diagram");
  });
  it("falls back to the url basename, then host", () => {
    expect(attachmentLabel({ url: "https://x.com/path/report.pdf" })).toBe("report.pdf");
    expect(attachmentLabel({ url: "https://x.com/" })).toBe("x.com");
  });
});
