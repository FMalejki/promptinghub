import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  playgroundProvider,
  buildAnthropicRequest,
  extractAnthropicText,
  PLAYGROUND_MAX_INPUT,
  DEFAULT_ANTHROPIC_MODEL,
} from "@/lib/playground";

export const dynamic = "force-dynamic";

// Run a prompt against an LLM. Env-gated: only works when a provider key is set
// (ANTHROPIC_API_KEY preferred, else OPENAI_API_KEY). Auth required so the key is
// never an open proxy. Returns 503 with { configured:false } when unconfigured.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = playgroundProvider(process.env as Record<string, string | undefined>);
  if (!provider) {
    return NextResponse.json(
      { error: "Playground is not configured. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) to enable it.", configured: false },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
  if (text.length > PLAYGROUND_MAX_INPUT) {
    return NextResponse.json({ error: `Prompt too long (max ${PLAYGROUND_MAX_INPUT} chars)` }, { status: 413 });
  }

  try {
    if (provider === "anthropic") {
      const model = process.env.PLAYGROUND_MODEL || DEFAULT_ANTHROPIC_MODEL;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(buildAnthropicRequest(model, text, 1024)),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return NextResponse.json({ error: "Provider error", status: res.status, detail: detail.slice(0, 300) }, { status: 502 });
      }
      const json = await res.json();
      return NextResponse.json({ output: extractAnthropicText(json), provider, model });
    }

    // OpenAI fallback (chat completions).
    const model = process.env.PLAYGROUND_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: text }] }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ error: "Provider error", status: res.status, detail: detail.slice(0, 300) }, { status: 502 });
    }
    const json = await res.json();
    const output = json?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ output, provider, model });
  } catch (e) {
    return NextResponse.json({ error: "Request failed" }, { status: 502 });
  }
}

// Lightweight capability probe for the UI: is the playground enabled?
export async function GET() {
  const configured = playgroundProvider(process.env as Record<string, string | undefined>) !== null;
  return NextResponse.json({ configured });
}
