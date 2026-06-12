/**
 * Seed PromptingHub with the OWNER's own distilled, anonymized agent skills,
 * posted from the owner's real account (kptgowniak@gmail.com → display "gowno").
 *
 * Source: universal, non-sensitive patterns the owner actually uses in ~/.claude
 * (CLAUDE.md working-log discipline, grill-with-docs, accumulated review lessons).
 * ALL private references removed (no internal project names, ticket ids, paths,
 * emails, or tooling names). Original wording — defaultSource: null (no false
 * attribution). Additive + idempotent (skips a prompt already owned by the acct).
 *
 * Usage:  npx tsx scripts/seed-owner-skills.ts
 * Requires MONGODB_URI in .env.local (run from the project dir).
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { seedDatabase, type SeedPrompt } from "../lib/seed";

// Best-effort .env.local loader (no dotenv dependency).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* rely on the environment */
}

const OWNER_EMAIL = "kptgowniak@gmail.com";

const OWNER_SKILLS: SeedPrompt[] = [
  {
    name: "Resume-After-Reset Working Log",
    description:
      "Make an agent keep a tight, curated working log (Goal / State / Next / Decisions) so it can resume cold after a context reset — not a transcript, a screenful of live state.",
    category: "Productivity",
    tags: ["agents", "workflow", "context", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.5-pro"],
    readme:
      "# Resume-After-Reset Working Log\n\nLong agent tasks die at the context boundary. This skill makes the agent maintain one small file that is *resume state, not a journal* — so after a compaction or `/clear` it can pick up exactly where it left off.\n\n**Use it for:** any multi-step task an agent runs across resets — migrations, audits, long builds.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Resume-After-Reset Working Log\n\nMaintain ONE curated working-log file for the current task. It is resume-state, not a journal.\n\n## Structure (keep exactly this)\n```\n# <task goal, one line>\n## State\n<where things stand right now — 1-3 lines>\n## Next\n- <the next concrete step>\n## Decisions\n- <decision> — <file:line>\n```\n\n## Rules\n- **Overwrite per task.** Don't accrete across tasks — start fresh.\n- **Keep it CURRENT.** Update State/Next as you progress; delete steps once done. It must reflect NOW, not the history of everything you tried.\n- **Screenful cap (~8KB).** Prune stale detail aggressively.\n- **Quality bar:** someone with zero context could read it and continue the task.\n- Convert relative dates to absolute. Reference code as `file:line`.\n\n## Why\nThe lossy auto-summary of a long session forgets the one decision you needed. A hand-curated screenful does not.",
      },
    ],
  },
  {
    name: "Verify Before You Claim Done",
    description:
      "A discipline prompt: never report a task 'done' or 'perfect' from reading code — verify on the real running system (run it, hit the live URL, click the UI) and report failures honestly.",
    category: "Productivity",
    tags: ["agents", "review", "quality", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "o3-mini"],
    readme:
      "# Verify Before You Claim Done\n\nThe most expensive agent failure mode is confidently reporting work as finished when it was never checked. This skill forces a verification step before any 'done' claim, and honest reporting when something fails.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Verify Before You Claim Done\n\nBefore you tell the user a task is complete, you MUST verify it on the real system — not by re-reading the code you wrote.\n\n## The rule\n- A passing build / green types are NOT proof a feature works. Exercise it: run the app, hit the live URL, click the actual UI, query the real data.\n- 'The file exists / the function is there' (a grep) is NOT 'the behavior is done'. Confirm the behavior.\n- If you deployed, re-check the deployed URL — a cached/stale response can look like the old version. Re-check until it's fresh.\n\n## Reporting\n- If something fails, say so plainly with the evidence (the error, the failing output).\n- If a step was skipped, say that.\n- Only state 'done' for what you actually observed working. Never say 'perfect' — say what you verified and what you didn't.\n\n## Why\nUsers forgive 'not done yet'. They don't forgive 'done' that wasn't. Honest, verified status beats confident, wrong status every time.",
      },
    ],
  },
  {
    name: "Ship & Verify Live (deploy discipline)",
    description:
      "After deploying, prove the change is actually live before you call it shipped: re-hit the real URL until the CDN cache is fresh — a green build is not evidence the user can see the change.",
    category: "Coding",
    tags: ["deployment", "devops", "verification", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.0-flash"],
    readme:
      "# Ship & Verify Live\n\nA deploy that 'succeeded' is not a deploy the user can see. CDNs cache, aliases lag, the first request after a deploy can be a stale hit. This skill closes the gap between 'deployed' and 'live'.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Ship & Verify Live\n\nAfter any deploy, do not report success until you've confirmed the change is served to a real request.\n\n## Procedure\n1. Deploy; capture the exact deployment URL from the deploy output (don't assume).\n2. If you alias/promote a domain, point it at *that* deployment, then verify the domain — not just the build URL.\n3. Fetch the affected page/endpoint with a cache-buster. If the response still looks like the OLD version, the first hit may be a stale CDN cache — re-fetch until it's fresh (look for the cache header flipping to a miss/fresh).\n4. Verify the actual change: the new text is present, the removed thing is gone (expect a 404 for deleted routes), the API returns the new shape.\n\n## Rules\n- A green build/exit-0 deploy is necessary, not sufficient. The proof is a live request showing the change.\n- Never tell the user 'it's live' from the deploy log alone.",
      },
    ],
  },
  {
    name: "Interrogate My Plan (evidence-required)",
    description:
      "Stress-test a plan or design one fork at a time: name the options, recommend one, back it with concrete evidence (file:line, logs, docs, git), and state the strongest counter-argument. One question per turn.",
    category: "Productivity",
    tags: ["planning", "decision-making", "review", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.5-pro"],
    readme:
      "# Interrogate My Plan (evidence-required)\n\nA rigorous interview for high-stakes decisions (architecture, big refactors, 'should I keep this infra?'). Same relentless one-question-at-a-time shape as a normal design review — but every recommendation must come with evidence you can verify, not a vibe.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Interrogate My Plan (evidence-required)\n\nInterview me about my plan until we reach shared understanding. Walk each branch of the decision tree, resolving dependencies one at a time. ONE question per turn.\n\n## For each question\n1. **Frame the fork.** Name the 2-3 options clearly; don't smuggle in a preferred answer through phrasing.\n2. **Recommend an answer.** State your pick.\n3. **Cite evidence for it** — at least one of: a real `path:line` you read, a log file + line, a docs URL with a quote, a `git log`/`git blame` finding, a web-search result with link. If you have none, say 'no evidence — pure judgment' (use sparingly).\n4. **State the strongest counter-argument** — what would push you the other way.\n\n## Rules\n- If a grep/codebase read can answer it, explore FIRST, then ask. Don't ask me what a search would tell you.\n- Never fabricate file paths, line numbers, log lines, or quotes. If it's not real, mark it 'pure judgment'.\n- A one-word answer (A/B/yes/no) is enough — accept it and move to the next branch.\n- If you find evidence contradicting your own earlier recommendation in this interview, say so and revise. Self-correction beats consistency.\n- Stop when I say 'enough/go', the tree bottoms out, or after ~8 questions the rest is clearly low-stakes.\n\n## Example turn\n> **Q (1/N):** Keep all three pending patches, or close the stalest one?\n> **Recommended:** Close the stalest.\n> **Evidence:** the run log shows it's been pending 11 cycles — near the soft-expiry window — and `git log --since=<date> --grep <id>` returns empty (no motion). The spec likely drifted.\n> **Counter:** if the spec is unchanged, applying it is a 1-minute real fix — closing wastes it.",
      },
    ],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✗ MONGODB_URI not set (put it in .env.local).");
    process.exit(1);
  }
  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "promptinghub");
    console.log(`Seeding ${OWNER_SKILLS.length} owner skills as ${OWNER_EMAIL}…`);
    const res = await seedDatabase(db, OWNER_SKILLS, {
      ownerEmail: OWNER_EMAIL,
      defaultSource: null, // original content — no attribution
      collections: [],
    });
    console.log("✓ Owner-skills seed complete:", res);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
