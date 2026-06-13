// Free, keyless semantic embeddings via Transformers.js (MiniLM, 384-dim) running
// locally in the Node runtime — no API key, no per-call cost. The model loads once
// per warm container (~1-2s) then embeds in a few ms. Every entry point fails SOFT
// (returns null) so search degrades to keyword ranking rather than erroring.

export const EMBEDDING_DIM = 384;
const MODEL = "Xenova/all-MiniLM-L6-v2";

// Cosine similarity of two equal-length vectors. embedText returns L2-normalized
// vectors (so this is effectively a dot product), but we normalize defensively so
// the helper is correct for any input. Pure + unit-testable.
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// The text we embed for a prompt: title + description + tags carry its searchable
// meaning (the full body is too long/noisy for one sentence embedding). Tags may
// arrive as an array or a comma-separated string (the publish form allows both).
export function embeddingTextFor(p: { name?: string; description?: string; tags?: string | string[] }): string {
  const tags = Array.isArray(p.tags)
    ? p.tags
    : typeof p.tags === "string"
    ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  return [p.name || "", p.description || "", ...tags].filter(Boolean).join(". ").trim();
}

let pipePromise: Promise<any> | null = null;
async function getPipeline(): Promise<any> {
  if (!pipePromise) {
    pipePromise = (async () => {
      // Dynamic import so merely importing this module (e.g. for cosineSimilarity)
      // never pulls in the heavy runtime — only embedText() does.
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false; // fetch from the hub
      // Serverless filesystems are read-only except /tmp — cache the model there.
      env.cacheDir = "/tmp/transformers-cache";
      return pipeline("feature-extraction", MODEL, { quantized: true });
    })().catch((e) => {
      pipePromise = null; // let a later call retry a transient load failure
      throw e;
    });
  }
  return pipePromise;
}

// Embed a short text into a 384-dim L2-normalized vector. Returns null on ANY
// failure so callers fall back to keyword search instead of erroring.
export async function embedText(text: string): Promise<number[] | null> {
  const clean = (text || "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!clean) return null;
  try {
    const extractor = await getPipeline();
    const out = await extractor(clean, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array);
  } catch {
    return null;
  }
}

// embedText with a hard ceiling: if the model is still cold-loading past `ms`,
// resolve null so the request returns promptly on keyword results. The load
// continues in the background, so the next request is warm and fully semantic.
export async function embedTextWithTimeout(text: string, ms = 4000): Promise<number[] | null> {
  return Promise.race([
    embedText(text),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
