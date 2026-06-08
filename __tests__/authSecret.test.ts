import { resolveAuthSecret, DEV_FALLBACK_SECRET } from "../lib/authSecret";

describe("resolveAuthSecret", () => {
  it("uses NEXTAUTH_SECRET when set", () => {
    expect(resolveAuthSecret({ NEXTAUTH_SECRET: "real-secret", NODE_ENV: "production" })).toBe("real-secret");
    expect(resolveAuthSecret({ NEXTAUTH_SECRET: "real-secret", NODE_ENV: "development" })).toBe("real-secret");
  });

  it("falls back to a dev secret outside production so local runs never throw NO_SECRET", () => {
    expect(resolveAuthSecret({ NODE_ENV: "development" })).toBe(DEV_FALLBACK_SECRET);
    expect(resolveAuthSecret({ NODE_ENV: "test" })).toBe(DEV_FALLBACK_SECRET);
    expect(resolveAuthSecret({})).toBe(DEV_FALLBACK_SECRET);
    // empty/whitespace secret is treated as missing
    expect(resolveAuthSecret({ NEXTAUTH_SECRET: "   ", NODE_ENV: "development" })).toBe(DEV_FALLBACK_SECRET);
  });

  it("stays strict in production: no fallback when the secret is missing", () => {
    expect(resolveAuthSecret({ NODE_ENV: "production" })).toBeUndefined();
    expect(resolveAuthSecret({ NEXTAUTH_SECRET: "", NODE_ENV: "production" })).toBeUndefined();
  });
});
