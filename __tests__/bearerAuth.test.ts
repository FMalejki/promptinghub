import { verifyBearerToken } from "../lib/bearerAuth";

const TOKEN = "s3cr3t-admin-token-1234567890";

describe("verifyBearerToken", () => {
  it("accepts an exact Bearer match", () => {
    expect(verifyBearerToken(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it("rejects when no expected token is configured (endpoint off)", () => {
    expect(verifyBearerToken(`Bearer ${TOKEN}`, undefined)).toBe(false);
    expect(verifyBearerToken(`Bearer ${TOKEN}`, "")).toBe(false);
    expect(verifyBearerToken(`Bearer ${TOKEN}`, null)).toBe(false);
  });

  it("rejects a missing or malformed Authorization header", () => {
    expect(verifyBearerToken(null, TOKEN)).toBe(false);
    expect(verifyBearerToken(undefined, TOKEN)).toBe(false);
    expect(verifyBearerToken("", TOKEN)).toBe(false);
    expect(verifyBearerToken(TOKEN, TOKEN)).toBe(false); // no "Bearer " prefix
    expect(verifyBearerToken(`bearer ${TOKEN}`, TOKEN)).toBe(false); // case-sensitive scheme
    expect(verifyBearerToken("Bearer ", TOKEN)).toBe(false); // empty token
  });

  it("rejects a wrong token of the same length", () => {
    const wrong = "x".repeat(TOKEN.length);
    expect(wrong.length).toBe(TOKEN.length);
    expect(verifyBearerToken(`Bearer ${wrong}`, TOKEN)).toBe(false);
  });

  it("rejects a wrong token of a different length (no timingSafeEqual throw)", () => {
    expect(verifyBearerToken(`Bearer ${TOKEN}extra`, TOKEN)).toBe(false);
    expect(verifyBearerToken(`Bearer ${TOKEN.slice(0, -1)}`, TOKEN)).toBe(false);
  });

  it("does not trim — a leading space from a double space is part of the token", () => {
    // "Bearer  token" → slice(7) = " token" which won't equal "token"
    expect(verifyBearerToken(`Bearer  ${TOKEN}`, TOKEN)).toBe(false);
  });
});
