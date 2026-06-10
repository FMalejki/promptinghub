// Set a deterministic 32-byte key BEFORE importing the crypto module.
process.env.PROMPT_ENC_KEY = "0".repeat(64); // 32 bytes of hex

import { encryptString, decryptString, encryptJson, decryptJson, encryptionAvailable } from "../lib/crypto";

describe("crypto (AES-256-GCM)", () => {
  it("reports availability when the key is set", () => {
    expect(encryptionAvailable()).toBe(true);
  });

  it("round-trips a string", () => {
    const blob = encryptString("hello secret prompt");
    expect(blob).toMatch(/^v1\./);
    expect(blob).not.toContain("hello"); // ciphertext, not plaintext
    expect(decryptString(blob)).toBe("hello secret prompt");
  });

  it("round-trips JSON (body + files)", () => {
    const payload = { body: "x", files: [{ path: "a.py", content: "print(1)" }] };
    expect(decryptJson(encryptJson(payload))).toEqual(payload);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptString("same")).not.toBe(encryptString("same"));
  });

  it("fails to decrypt tampered ciphertext", () => {
    const blob = encryptString("secret");
    const tampered = blob.slice(0, -4) + "AAAA";
    expect(() => decryptString(tampered)).toThrow();
  });
});
