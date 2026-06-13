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
  {
    name: "Audit & Prune Unused Agent Tooling",
    description:
      "Track which installed skills, MCP servers, and subagents your agent actually USES per session, produce a periodic report of never-used ones, and rank tools by context cost so you can archive the dead weight reversibly.",
    category: "Productivity",
    tags: ["agents", "mcp", "context", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.5-pro"],
    readme:
      "# Audit & Prune Unused Agent Tooling\n\nEvery installed skill, MCP server, and subagent adds tool definitions to your agent's context on every session — whether or not you ever use it. Over time that's a silent tax on speed and cost. This skill tracks installed-vs-actually-used and tells you what to remove.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Audit & Prune Unused Agent Tooling\n\nKeep the agent's tool surface lean by measuring what is actually used and archiving the rest — reversibly.\n\n## Instrument (two hooks)\n- **On every tool call** (post-tool hook): append one line — `{session, tool, server}` — to a usage log.\n- **On session start**: snapshot the installed inventory (skills, MCP servers, subagents, memory entries) to an inventory log.\n\n## Report (periodically)\nJoin the two logs and emit a report with removal candidates:\n1. **Skills** installed but never invoked in the window.\n2. **MCP servers** configured but never called.\n3. **Subagents** installed but never spawned.\n4. **Stale memory** entries untouched for > N days.\n\n## Rank by context cost\nFor each MCP server / connector seen: `est_tokens ≈ tool_count × ~200`. Rank by `est_tokens × (1 / usage_rate)` — the expensive-and-unused ones float to the top. Also flag:\n- **Duplicate scopes** — the same coverage registered under two ids (pick one, disconnect the other).\n- **Zero-use non-essentials** — no calls in the window and not marked essential → top removal candidates.\n\n## Apply — reversibly\nArchive (don't delete) each removed item into an `archived/` area with a manifest recording what/when/where-to-restore. Offer `--dry-run`, `--semi-auto` (low-risk only), `--interactive`, and `--restore <name>`. Never touch the live MCP config automatically — surface those for manual disable.\n\n## Why\nUnused tools don't just sit there — they crowd context every single session. Measuring usage turns 'I think I need all this' into a ranked, reversible cleanup.",
      },
    ],
  },
  {
    name: "Auto-Extract Lessons from Each Session",
    description:
      "On session end, distill the durable lessons from the transcript into your project's long-term memory automatically — so the next session starts smarter instead of relearning what already went wrong.",
    category: "Productivity",
    tags: ["agents", "memory", "workflow", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "o3-mini"],
    readme:
      "# Auto-Extract Lessons from Each Session\n\nThe knowledge an agent earns in a session — a gotcha, a corrected assumption, a preference the user stated — evaporates when the session ends. This skill captures it on the way out, as structured memory, with zero manual effort.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Auto-Extract Lessons from Each Session\n\nAt session end, mine the transcript for durable lessons and append them to per-project memory — detached so it never blocks exit.\n\n## When to run\nA session-end hook. Gate hard to avoid noise:\n- Skip if the project has no memory store.\n- Skip if the transcript is tiny (< ~20 turns — nothing learned) or enormous (cap the byte size).\n- Skip if THIS run is the extractor itself re-firing (guard with an env flag) so it can't recurse.\n\n## What to extract\nOnly things that change FUTURE behavior:\n- A correction the user made ('don't do X, do Y') + the why.\n- A non-obvious fact about the system that cost time to discover.\n- A stated preference or constraint not visible in the code.\nSkip restating the code, the git history, or one-off conversational detail.\n\n## Shape\nOne lesson = one small memory entry: a one-line summary, then **Why** and **How to apply**. Dedupe against existing entries — update the matching one instead of creating a near-duplicate.\n\n## Why\nAgents that don't capture lessons relearn the same mistakes every session. A 10-second end-of-session distillation compounds into an agent that actually gets better at YOUR project over time.",
      },
    ],
  },
  {
    name: "Guardrails: Block Destructive Commands Unattended",
    description:
      "A pre-execution gate that denies the handful of commands that are almost always a mistake when an agent runs unattended — force-push to main, hard-reset to origin, rm -rf / — while leaving their legitimate variants alone.",
    category: "Coding",
    tags: ["safety", "devops", "agents", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.0-flash"],
    readme:
      "# Guardrails: Block Destructive Commands Unattended\n\nAn autonomous agent with shell access is one bad command away from an unrecoverable mess. This skill is a narrow, surgical pre-execution check: it blocks only the almost-always-wrong commands and stays silent on everything else, so it protects without getting in the way.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Guardrails — Block Destructive Commands Unattended\n\nBefore a shell command runs, inspect it and DENY the small set that is almost never right to run unattended. Stay silent (allow) on everything else — a guardrail that cries wolf gets disabled.\n\n## Block (deny + explain)\n- `git push --force` / `-f` to **main/master** on any remote.\n- `git reset --hard origin/main` (or master).\n- `git push --no-verify`.\n- `rm -rf /` (or `~` / `$HOME`) at top level.\n- `chmod -R 777` on `$HOME`.\nTolerate an explicit `-C <dir>` between `git` and the subcommand so the rules don't miss that form.\n\n## Do NOT block (intentional)\n- Force-push on a **feature branch** (normal during rebase).\n- `rm -rf` inside a project subdir (normal cleanup).\n- Destructive ops inside a sandbox/worktree dir (isolated by definition).\n\n## How\nMatch the normalized command; on a hit, return a deny decision with a one-line reason and log it. No match → exit silently so the normal permission flow continues.\n\n## Why\nYou want autonomy without catastrophe. Blocking five specific footguns — and nothing else — buys most of the safety with almost none of the friction.",
      },
    ],
  },
  {
    name: "Size the Compaction Window to the Model",
    description:
      "Set your agent's auto-compaction threshold as a fraction of the ACTIVE model's context window at session start — big-context models compact later, small ones sooner — instead of one fixed number that's wrong for half your models.",
    category: "Productivity",
    tags: ["agents", "context", "configuration", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.5-pro"],
    readme:
      "# Size the Compaction Window to the Model\n\nA fixed auto-compaction threshold is wrong for half your models: too eager on a large-context model (you compact away useful history), too late on a small one (you overflow). This skill makes the threshold track the model you're actually running.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Size the Compaction Window to the Model\n\nAt session start, set the auto-compaction threshold to a fixed FRACTION (~50%) of the active model's context window, not a hard-coded constant.\n\n## How\n1. On session start, read the active model id/name from the session payload.\n2. Map it to its context window (e.g. a 1M-context variant → much larger than a standard one).\n3. Set the compaction threshold to ~50% of that window. Unknown model → leave the setting untouched and just log it.\n4. Write the value before the session does real work, so it's correct from the first turn.\n\n## Why ~50%\nIt leaves head-room to both keep recent context AND fit the running summary, on whatever model is loaded. Tune the fraction to taste — the point is that it SCALES with the window instead of being a single number that's wrong half the time.\n\n## Why\nModels you switch between can differ 10× in context size. One static threshold can't serve them all; a proportional one does.",
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
