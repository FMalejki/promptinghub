import { isVerifiedHandle } from "../lib/verified";

// isVerifiedHandle gates moderator/curator access (via isVerifiedEmail →
// /api/reports), so its case/whitespace handling is a security boundary worth
// locking down with tests.
describe("isVerifiedHandle", () => {
  const original = process.env.VERIFIED_HANDLES;
  afterEach(() => {
    if (original === undefined) delete process.env.VERIFIED_HANDLES;
    else process.env.VERIFIED_HANDLES = original;
  });

  it("recognizes the seeded founder handles", () => {
    expect(isVerifiedHandle("adriankrawczyk")).toBe(true);
    expect(isVerifiedHandle("filipmalejki")).toBe(true);
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(isVerifiedHandle("AdrianKrawczyk")).toBe(true);
    expect(isVerifiedHandle("  FILIPMALEJKI  ")).toBe(true);
  });

  it("rejects non-verified handles", () => {
    expect(isVerifiedHandle("randomuser")).toBe(false);
    expect(isVerifiedHandle("")).toBe(false);
    expect(isVerifiedHandle("adrian")).toBe(false); // not a prefix match
  });

  it("extends the set via the VERIFIED_HANDLES env var (case/space-insensitive)", () => {
    process.env.VERIFIED_HANDLES = " NewMod , another_one ";
    expect(isVerifiedHandle("newmod")).toBe(true);
    expect(isVerifiedHandle("ANOTHER_ONE")).toBe(true);
    // seeded handles still work alongside env additions
    expect(isVerifiedHandle("adriankrawczyk")).toBe(true);
    // a handle not in seed or env stays false
    expect(isVerifiedHandle("intruder")).toBe(false);
  });

  it("handles an empty/garbage env var without granting access", () => {
    process.env.VERIFIED_HANDLES = " , ,, ";
    expect(isVerifiedHandle("adriankrawczyk")).toBe(true);
    expect(isVerifiedHandle("")).toBe(false);
    expect(isVerifiedHandle(" ")).toBe(false);
  });
});
