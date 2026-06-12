import {
  aiImportProvider,
  aiImportAvailable,
  buildExtractionInstruction,
  extractFirstJsonObject,
  mergeAiDraft,
  AI_IMPORT_MAX_INPUT,
} from "../lib/aiImport";
import { PROMPT_CATEGORIES } from "../lib/constants";

describe("aiImportProvider — prefers FREE providers, degrades cleanly", () => {
  it("is null when no key is set", () => {
    expect(aiImportProvider({})).toBeNull();
    expect(aiImportAvailable({})).toBe(false);
  });
  it("prefers Gemini (free) above everything", () => {
    const c = aiImportProvider({ GEMINI_API_KEY: "g", GROQ_API_KEY: "k", OPENAI_API_KEY: "o", ANTHROPIC_API_KEY: "a" });
    expect(c?.provider).toBe("gemini");
    expect(c?.free).toBe(true);
  });
  it("accepts GOOGLE_API_KEY as the Gemini key too", () => {
    expect(aiImportProvider({ GOOGLE_API_KEY: "g" })?.provider).toBe("gemini");
  });
  it("falls back to Groq (free) when no Gemini key", () => {
    const c = aiImportProvider({ GROQ_API_KEY: "k", OPENAI_API_KEY: "o" });
    expect(c?.provider).toBe("groq");
    expect(c?.free).toBe(true);
  });
  it("uses paid providers only when no free key exists", () => {
    expect(aiImportProvider({ OPENAI_API_KEY: "o" })?.provider).toBe("openai");
    expect(aiImportProvider({ ANTHROPIC_API_KEY: "a" })?.provider).toBe("anthropic");
    expect(aiImportProvider({ OPENAI_API_KEY: "o" })?.free).toBe(false);
  });
  it("ignores blank keys", () => {
    expect(aiImportProvider({ GEMINI_API_KEY: "   " })).toBeNull();
  });
  it("honours IMPORT_AI_MODEL override", () => {
    expect(aiImportProvider({ GROQ_API_KEY: "k", IMPORT_AI_MODEL: "llama-x" })?.model).toBe("llama-x");
  });
});

describe("buildExtractionInstruction", () => {
  it("lists the allowed categories and the required JSON keys", () => {
    const inst = buildExtractionInstruction("hello prompt", PROMPT_CATEGORIES);
    for (const cat of PROMPT_CATEGORIES) expect(inst).toContain(cat);
    expect(inst).toMatch(/"name"/);
    expect(inst).toMatch(/"category"/);
    expect(inst).toMatch(/"tags"/);
    expect(inst).toMatch(/"isSkill"/);
    expect(inst).toContain("hello prompt");
  });
  it("caps the included prompt text", () => {
    const huge = "x".repeat(AI_IMPORT_MAX_INPUT + 5000);
    const inst = buildExtractionInstruction(huge, PROMPT_CATEGORIES);
    expect(inst.length).toBeLessThan(AI_IMPORT_MAX_INPUT + 2000);
  });
});

describe("extractFirstJsonObject — tolerant of fences/prose", () => {
  it("parses a bare JSON object", () => {
    expect(extractFirstJsonObject('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips ```json code fences", () => {
    expect(extractFirstJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });
  it("ignores prose around the object", () => {
    expect(extractFirstJsonObject('Sure! Here you go:\n{"a":3}\nHope that helps.')).toEqual({ a: 3 });
  });
  it("returns null on garbage", () => {
    expect(extractFirstJsonObject("no json here")).toBeNull();
    expect(extractFirstJsonObject("")).toBeNull();
    expect(extractFirstJsonObject("{not valid")).toBeNull();
  });
});

describe("mergeAiDraft — AI metadata over a lossless heuristic base", () => {
  const raw = "You are an expert code reviewer. Review the diff I paste and flag bugs, security issues, and unclear naming.";

  it("overlays a clean title/description/category/tags", () => {
    const d = mergeAiDraft(raw, {
      name: "Code Review Assistant",
      description: "Reviews a pasted diff for bugs, security and naming.",
      category: "Code Review",
      tags: ["code-review", "Security", "#bugs", "code-review"],
      isSkill: false,
    });
    expect(d?.name).toBe("Code Review Assistant");
    expect(d?.category).toBe("Code Review");
    // tags lowercased, '#' stripped, de-duped
    expect(d?.tags).toEqual(["code-review", "security", "bugs"]);
    // body comes from the heuristic (the user's actual prompt), never rewritten
    expect(d?.body).toContain("expert code reviewer");
  });

  it("canonicalizes a loosely-cased category", () => {
    expect(mergeAiDraft(raw, { category: "coding" })?.category).toBe("Coding");
  });

  it("falls back to the heuristic field when the AI value is invalid/missing", () => {
    const d = mergeAiDraft(raw, { category: "Nonsense Category", name: "" });
    // invalid category → heuristic default, not the AI garbage
    expect(PROMPT_CATEGORIES.includes(d?.category as any) || d?.category === "Other").toBe(true);
    expect(d?.name).toBeTruthy();
  });

  it("respects an AI isSkill=true flag", () => {
    expect(mergeAiDraft(raw, { isSkill: true })?.isSkill).toBe(true);
  });

  it("returns null for empty input", () => {
    expect(mergeAiDraft("", { name: "x" })).toBeNull();
  });

  it("survives a null/garbage AI payload (pure heuristic result)", () => {
    const d = mergeAiDraft(raw, null);
    expect(d?.name).toBeTruthy();
    expect(d?.body).toContain("expert code reviewer");
  });
});
