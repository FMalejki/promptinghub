// Realistic MULTI-FILE prompts (orchestration / multi-agent / RAG / eval) so the
// multi-file viewer (tabs) and "infra as a prompt" story have real content. All
// original content (defaultSource:null) spread across existing PASSWORDLESS persona
// accounts (ns/215 rule — never a real user). Idempotent via owner+name.
import type { SeedPrompt } from "../../lib/seed";

// Existing seed personas (all passwordless — safe owners per ns/215).
const A = {
  noah: { authorEmail: "noah.reyes.ai@gmail.com", authorName: "Noah Reyes" },
  devin: { authorEmail: "devin.oyelaran@promptinghub.app", authorName: "Devin Oyelaran" },
  liang: { authorEmail: "liang.wei.ml@gmail.com", authorName: "Liang Wei" },
  marcus: { authorEmail: "marcus.vale.dev@gmail.com", authorName: "Marcus Vale" },
};

export const MULTIFILE_PROMPTS: SeedPrompt[] = [
  {
    name: "Map-Reduce Research Agent",
    description:
      "Orchestrate a fan-out/fan-in research run: split a question into sub-queries, research each in parallel, then synthesize one cited answer.",
    category: "Productivity",
    tags: ["agents", "orchestration", "research", "multi-file", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "o3-mini"],
    ...A.noah,
    readme:
      "# Map-Reduce Research Agent\n\nThree roles for a fan-out/fan-in research run. Drive `orchestrator.md` yourself (or from a script); it dispatches `worker.md` per sub-query and finishes with `reducer.md`.\n\n**Inputs:** one research question. **Output:** a synthesized, cited answer with an explicit confidence + gaps section.",
    files: [
      {
        path: "orchestrator.md",
        content:
          "# Role: Orchestrator\n\nYou decompose a research question and coordinate workers. You do NOT answer the question yourself.\n\n## Procedure\n1. Restate the question in one sentence; list the 3–6 sub-questions whose answers would fully cover it (MECE — no overlap, no gaps).\n2. For each sub-question, emit a task line: `WORKER <id>: <sub-question>` (one per line). Stop and wait for worker results.\n3. When all worker results return, hand them verbatim to the Reducer.\n\n## Rules\n- Never merge sub-questions to save calls — coverage beats cost here.\n- If the question is ambiguous, ask ONE clarifying question before decomposing.\n- Keep sub-questions answerable independently (a worker sees only its own).",
      },
      {
        path: "worker.md",
        content:
          "# Role: Worker\n\nYou answer exactly ONE sub-question. You have no memory of the others.\n\n## Output (strict)\n```\nFINDING <id>\nclaim: <one-sentence answer>\nevidence: <key facts / sources you relied on>\nconfidence: high | medium | low\ncaveats: <what would change this answer, or 'none'>\n```\n\n## Rules\n- If you don't actually know, say `confidence: low` and state what you'd need — never fabricate a source.\n- No preamble, no restating the question. Just the FINDING block.",
      },
      {
        path: "reducer.md",
        content:
          "# Role: Reducer\n\nYou synthesize all FINDING blocks into one answer. You never add facts a worker didn't supply.\n\n## Procedure\n1. Group findings; resolve conflicts by preferring higher `confidence`, and flag any you can't resolve.\n2. Write the answer: lead with the direct conclusion, then the supporting points (cite each by its worker id).\n3. End with `Confidence: …` and a `Gaps:` list (sub-questions that came back low-confidence).\n\n## Rules\n- If findings contradict and you can't adjudicate, present both and say so — don't average them into a false middle.\n- Length follows the question; don't pad.",
      },
    ],
  },
  {
    name: "Multi-Agent Debate Panel",
    description:
      "Stress-test a decision with a moderated debate: a proponent and a skeptic argue, a judge scores the strongest surviving case.",
    category: "Productivity",
    tags: ["agents", "debate", "decision-making", "multi-file", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o"],
    ...A.devin,
    readme:
      "# Multi-Agent Debate Panel\n\nFour roles to pressure-test a claim or decision. Run `moderator.md`, which frames the motion and alternates `panelist.md` (as Proponent then Skeptic), then calls `judge.md`.\n\n**Use it for:** architecture calls, hiring debates, 'should we build X' — anywhere a single confident answer is risky.",
    files: [
      {
        path: "moderator.md",
        content:
          "# Role: Moderator\n\nYou frame and run the debate; you never take a side.\n\n## Procedure\n1. Restate the decision as a crisp motion: `This panel argues that <X>.`\n2. List the 2–4 criteria the judge should weigh (e.g. cost, risk, reversibility, time-to-value).\n3. Run two rounds: Proponent → Skeptic → Proponent rebuttal → Skeptic rebuttal.\n4. Hand the transcript + criteria to the Judge.\n\n## Rules\n- Cut any argument that drifts off the motion.\n- Keep each turn to its strongest 2–3 points — no Gish-gallop.",
      },
      {
        path: "panelist.md",
        content:
          "# Role: Panelist (Proponent or Skeptic)\n\nYou argue ONLY your assigned side, as well as it can honestly be argued.\n\n## Output\n- 2–3 strongest points, each: `claim → why it holds → what it would cost to be wrong`.\n- On a rebuttal turn, attack the OTHER side's weakest load-bearing assumption — name it explicitly.\n\n## Rules\n- Steelman, don't strawman: argue the best version of your side.\n- Concede a point if it's genuinely lost — credibility is your currency with the judge.",
      },
      {
        path: "judge.md",
        content:
          "# Role: Judge\n\nYou decide based on the transcript and criteria — not your own prior.\n\n## Output\n```\nWinner: Proponent | Skeptic | Too-close\nReasoning: <which criteria decided it, and the single most decisive exchange>\nStrongest surviving argument: <verbatim or paraphrased>\nWhat would flip this: <the evidence/condition that would change the verdict>\n```\n\n## Rules\n- Weight criteria as the Moderator set them; if one side simply went unrebutted, say so.\n- 'Too-close' is allowed only if you also state the cheapest experiment to break the tie.",
      },
    ],
  },
  {
    name: "RAG Pipeline Blueprint",
    description:
      "A staged build sheet for a retrieval-augmented generation pipeline: chunk & embed, retrieve & rerank, generate with citations, and evaluate.",
    category: "Data Analysis",
    tags: ["rag", "retrieval", "embeddings", "evaluation", "multi-file", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.5-pro"],
    ...A.liang,
    readme:
      "# RAG Pipeline Blueprint\n\nFour stage files you can follow in order to design (or review) a RAG system. Each stage states the decision, the default, and the failure mode it prevents. Pair it with your own corpus + eval set.",
    files: [
      {
        path: "00-chunk-embed.md",
        content:
          "# Stage 0 — Chunk & Embed\n\n## Decisions\n- **Chunk size:** default 512 tokens with 64-token overlap; smaller for dense reference text, larger for narrative.\n- **Split on structure** (headings, code blocks) before falling back to token windows — never split mid-sentence/mid-function.\n- **Metadata:** carry `source`, `section`, `updated_at` on every chunk for filtering + citation.\n\n## Failure it prevents\nContext fragmentation: answers that miss the half of the idea that fell in the next chunk.",
      },
      {
        path: "01-retrieve-rerank.md",
        content:
          "# Stage 1 — Retrieve & Rerank\n\n## Decisions\n- **Hybrid retrieval:** dense (embeddings) + sparse (BM25); union the top-k of each.\n- **Rerank** the merged set with a cross-encoder; keep top 5–8 for the generator.\n- **Filter** by metadata first (tenant, recency) so you never retrieve across a boundary.\n\n## Failure it prevents\n'Lost in the middle' + irrelevant-but-similar chunks crowding out the actually-relevant one.",
      },
      {
        path: "02-generate-cite.md",
        content:
          "# Stage 2 — Generate with Citations\n\n## Decisions\n- Pass retrieved chunks with stable ids; instruct the model to cite `[id]` for every claim.\n- **Refuse-to-answer** path: if no chunk supports the question, say so — do not fall back to parametric memory.\n- Keep the system prompt's task rules ABOVE the retrieved context.\n\n## Failure it prevents\nConfident hallucination: ungrounded answers that look cited but aren't.",
      },
      {
        path: "03-evaluate.md",
        content:
          "# Stage 3 — Evaluate\n\n## Metrics\n- **Retrieval:** hit@k / recall on a labeled query→chunk set.\n- **Faithfulness:** is every claim supported by a retrieved chunk? (LLM-graded, sampled + spot-checked.)\n- **Answer quality:** correctness vs a gold answer; refusal-correctness on unanswerable queries.\n\n## Loop\nEval BEFORE shipping any chunking/retrieval change — a 'better' embedding model often regresses recall on your corpus. Track per-stage so you know which knob moved the metric.",
      },
    ],
  },
  {
    name: "LLM Eval Harness",
    description:
      "Turn 'it feels better' into a number: a rubric, a strict grader prompt, and a report template for A/B-ing prompt or model changes.",
    category: "Coding",
    tags: ["evaluation", "llm-ops", "testing", "multi-file", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "o3-mini"],
    ...A.marcus,
    readme:
      "# LLM Eval Harness\n\nThree files to evaluate a prompt/model change without vibes. Define your axes in `rubric.md`, score each output with `grader.md`, and summarize an A/B run with `report-template.md`.",
    files: [
      {
        path: "rubric.md",
        content:
          "# Rubric\n\nScore each output 0–2 on each axis (0 = fails, 1 = partial, 2 = fully meets). Customize the axes per task.\n\n| Axis | 0 | 1 | 2 |\n|---|---|---|---|\n| Correctness | wrong/unsupported | minor error | fully correct |\n| Instruction-following | ignores key ask | partial | follows all constraints |\n| Format | unusable | needs cleanup | drop-in usable |\n| Concision | padded/rambly | some filler | tight |\n\nWeight axes if some matter more; record the weights so runs are comparable.",
      },
      {
        path: "grader.md",
        content:
          "# Role: Grader\n\nYou score ONE output against the rubric. You are strict and you never reward effort.\n\n## Output (strict JSON)\n```json\n{ \"scores\": { \"correctness\": 0, \"instruction\": 0, \"format\": 0, \"concision\": 0 },\n  \"weighted_total\": 0.0,\n  \"failure_mode\": \"<one phrase, or 'none'>\",\n  \"evidence\": \"<the specific span that justifies the lowest score>\" }\n```\n\n## Rules\n- Grade the output as given — do not fix it in your head and score the fixed version.\n- If the task has a gold answer, compare to it; otherwise grade against the rubric only.\n- No ties-to-be-nice: a 1 must cite what's missing.",
      },
      {
        path: "report-template.md",
        content:
          "# A/B Report\n\n**Change:** <prompt vN → vN+1 / model A → B>\n**Eval set:** <name, N items>\n\n| Variant | n | mean weighted | correctness | instruction | format | concision |\n|---|---|---|---|---|---|---|\n| A (baseline) | | | | | | |\n| B (candidate) | | | | | | |\n\n**Verdict:** ship B / keep A / inconclusive (need larger n)\n**Regressions:** <axes or item-classes where B got worse>\n**Top 3 failures (B):** <ids + failure_mode>\n\nRule: don't ship on a mean alone — read the items B regressed on. A higher average that breaks a critical class is not an improvement.",
      },
    ],
  },
];
