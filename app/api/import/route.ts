import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parsePastedPrompt } from "@/lib/import";
import { PROMPT_CATEGORIES } from "@/lib/constants";
import {
  aiImportProvider,
  buildExtractionInstruction,
  extractFirstJsonObject,
  mergeAiDraft,
  AI_IMPORT_MAX_INPUT,
  type AiImportChoice,
} from "@/lib/aiImport";

export const dynamic = "force-dynamic";

// Ask the configured LLM for the raw text completion of our extraction instruction.
// Returns null on any failure (no key, network, bad status, timeout) so the caller
// can fall back to the deterministic heuristic. ~12s timeout keeps free tiers honest.
async function callImportModel(choice: AiImportChoice, instruction: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    if (choice.provider === "gemini") {
      const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${choice.model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruction }] }],
          generationConfig: { temperature: 0.2, response_mime_type: "application/json", maxOutputTokens: 800 },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const json = await res.json();
      const parts = json?.candidates?.[0]?.content?.parts;
      return Array.isArray(parts) ? parts.map((p: any) => p?.text || "").join("") : null;
    }

    if (choice.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: choice.model, max_tokens: 800, messages: [{ role: "user", content: instruction }] }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const json = await res.json();
      const content = Array.isArray(json?.content) ? json.content : [];
      return content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("");
    }

    // groq + openai share the OpenAI chat-completions shape.
    const url =
      choice.provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    const key = choice.provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: choice.model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [{ role: "user", content: instruction }],
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Preview-only: parse pasted text into a draft the user reviews before publishing.
// Uses a configured LLM (free Gemini/Groq preferred) to extract clean title /
// description / category / tags / isSkill, and ALWAYS falls back to the heuristic
// parser when no key is set or the model call fails. Never writes to the DB.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = (await req.json().catch(() => null)) as { text?: string; source?: string } | null;
  if (!data || typeof data.text !== "string") {
    return NextResponse.json({ error: "Provide { text }" }, { status: 400 });
  }
  const source = data.source || "paste";
  const text = data.text.slice(0, AI_IMPORT_MAX_INPUT + 4000); // hard cap input

  const choice = aiImportProvider(process.env as Record<string, string | undefined>);
  if (choice) {
    const raw = await callImportModel(choice, buildExtractionInstruction(text, PROMPT_CATEGORIES));
    const parsed = raw ? extractFirstJsonObject(raw) : null;
    const aiDraft = parsed ? mergeAiDraft(text, parsed, source) : null;
    if (aiDraft) return NextResponse.json({ draft: aiDraft, via: "ai" });
    // fall through to heuristic on any AI failure
  }

  const draft = parsePastedPrompt(text, source);
  if (!draft) return NextResponse.json({ error: "Nothing to import" }, { status: 422 });
  return NextResponse.json({ draft, via: "heuristic" });
}
