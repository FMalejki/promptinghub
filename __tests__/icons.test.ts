import { readFileSync, existsSync } from "fs";
import { join } from "path";

// The favicon / app icons are served via the Next.js App Router file convention
// (app/icon.png, app/apple-icon.png). Next auto-injects the <link rel="icon">
// tags from these files, so their mere presence is what makes the browser-tab
// favicon work. Guard against an accidental deletion regressing the brand mark.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("app icons (favicon)", () => {
  const root = join(__dirname, "..");
  for (const name of ["icon.png", "apple-icon.png"]) {
    it(`app/${name} exists and is a real PNG`, () => {
      const p = join(root, "app", name);
      expect(existsSync(p)).toBe(true);
      const buf = readFileSync(p);
      // Valid PNG header and not a trivial/empty placeholder.
      expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
      expect(buf.length).toBeGreaterThan(2000);
    });
  }
});
