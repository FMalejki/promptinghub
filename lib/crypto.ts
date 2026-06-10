import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

// AES-256-GCM encryption for "locked" prompt contents (encryption-at-rest).
// The key comes from PROMPT_ENC_KEY (32 bytes, hex or base64). When it's not
// configured, encryptionAvailable() is false and locking is refused at the API
// layer — we never silently store would-be-locked content as plaintext.
//
// NOTE: this protects content at rest + gates it from unauthorized viewers
// (server-side decrypt only). It is NOT and cannot be "an LLM that keeps a
// secret" — once an authorized client/model has the plaintext, it's plaintext.

function getKey(): Buffer | null {
  const raw = process.env.PROMPT_ENC_KEY;
  if (!raw) return null;
  let buf: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) buf = Buffer.from(raw, "hex");
  else buf = Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

export function encryptionAvailable(): boolean {
  return getKey() !== null;
}

export function encryptString(plain: string): string {
  const key = getKey();
  if (!key) throw new Error("PROMPT_ENC_KEY not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptString(blob: string): string {
  const key = getKey();
  if (!key) throw new Error("PROMPT_ENC_KEY not configured");
  const parts = blob.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("bad ciphertext");
  const iv = Buffer.from(parts[1], "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(Buffer.from(parts[2], "base64"));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8");
}

export function encryptJson(obj: unknown): string {
  return encryptString(JSON.stringify(obj));
}

export function decryptJson<T>(blob: string): T {
  return JSON.parse(decryptString(blob)) as T;
}
