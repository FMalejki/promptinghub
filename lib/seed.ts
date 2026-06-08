import { Db, ObjectId } from "mongodb";
import { createPrompt } from "./prompts";
import { createCollection, addPromptToCollection } from "./collections";

// Real-data seed. Inserts a curated CC0 prompt set (f/awesome-chatgpt-prompts)
// plus a few public collections, so /tags and /collections stop reading empty.
// Idempotent: skips prompts/collections that already exist for the owner, so it
// is safe to re-run. The agent can't write prod; this is run by the user via
// `npm run seed:prompts` (scripts/seed-prompts.ts).

export type SeedPrompt = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  // Provide body (single-file) OR files[] (multi-file). At least one is required.
  body?: string;
  files?: { path: string; content: string }[];
  // Model ids this prompt was tested on, e.g. ["gemini-2.0-flash", "gpt-4o"].
  testedModels?: string[];
  sourceUrl?: string;
  sourceAuthor?: string;
  // Optional per-prompt author (creates/uses that PromptingHub account) so a seed
  // batch can be spread across multiple believable authors, not just the runner.
  authorEmail?: string;
  authorName?: string;
};

export const SEED_SOURCE = {
  name: "awesome-chatgpt-prompts",
  url: "https://github.com/f/awesome-chatgpt-prompts",
  license: "CC0-1.0",
};

// Collections group seeded prompts by name. Names MUST match AWESOME_PROMPTS.
export const SEED_COLLECTIONS: { name: string; description: string; prompts: string[] }[] = [
  {
    name: "Developer toolkit",
    description: "Prompts that turn the model into your terminal, console, and architecture sparring partner.",
    prompts: ["Linux Terminal", "JavaScript Console", "UX/UI Developer", "Cyber Security Specialist", "IT Architect"],
  },
  {
    name: "Writing & language",
    description: "Translate, polish, and tell stories — prompts for everything text.",
    prompts: ["English Translator and Improver", "Storyteller", "Poet", "Novelist", "Plagiarism Checker"],
  },
  {
    name: "Learn anything",
    description: "Patient explainers for math, language, and the origins of words.",
    prompts: ["Math Teacher", "English Pronunciation Helper", "Etymologist", "Debate Coach"],
  },
  {
    name: "Just for fun",
    description: "Comedy, rap, magic, and travel — prompts to play with.",
    prompts: ["Stand-up Comedian", "Rapper", "Magician", "Travel Guide"],
  },
  {
    name: "Career & business",
    description: "Mock interviews, recruiting, and coaching to move your career forward.",
    prompts: ["Interviewer", "Recruiter", "Career Counselor", "Life Coach"],
  },
];

export type SeedResult = {
  ownerEmail: string;
  promptsCreated: number;
  promptsSkipped: number;
  collectionsCreated: number;
  collectionsSkipped: number;
};

export async function seedDatabase(
  db: Db,
  dataset: SeedPrompt[],
  opts: { ownerEmail: string; ownerName?: string },
): Promise<SeedResult> {
  const ownerEmail = opts.ownerEmail;
  const ownerName = opts.ownerName || ownerEmail.split("@")[0];

  // Ensure a user doc exists so the prompts/collections have a named owner
  // (listPublicCollections looks the owner up in `users`).
  await db.collection("users").updateOne(
    { email: ownerEmail },
    { $setOnInsert: { email: ownerEmail, name: ownerName, image: null, createdAt: new Date() } },
    { upsert: true },
  );

  let promptsCreated = 0;
  let promptsSkipped = 0;
  const idByName = new Map<string, string>();
  const ensuredUsers = new Set<string>([ownerEmail]);

  for (const sp of dataset) {
    if (!sp.body && !(sp.files && sp.files.length)) {
      promptsSkipped++;
      continue; // a prompt needs a body or at least one file
    }
    // Author this prompt under its own account when given, else the runner.
    const author = sp.authorEmail || ownerEmail;
    if (!ensuredUsers.has(author)) {
      await db.collection("users").updateOne(
        { email: author },
        { $setOnInsert: { email: author, name: sp.authorName || author.split("@")[0], image: null, createdAt: new Date() } },
        { upsert: true },
      );
      ensuredUsers.add(author);
    }

    const existing = await db.collection("prompts").findOne({ ownerEmail: author, name: sp.name });
    if (existing) {
      promptsSkipped++;
      idByName.set(sp.name, existing._id.toString());
      continue;
    }
    const created = await createPrompt(db, author, {
      name: sp.name,
      description: sp.description,
      category: sp.category,
      ...(sp.files && sp.files.length ? { files: sp.files } : { body: sp.body }),
      tags: sp.tags,
      testedModels: (sp.testedModels ?? []).map((modelId) => ({ modelId })),
    });
    // Stamp attribution (CC0 doesn't require it, but we keep it as good practice).
    await db.collection("prompts").updateOne(
      { _id: new ObjectId(created.id) },
      {
        $set: {
          source: SEED_SOURCE.name,
          sourceUrl: sp.sourceUrl ?? SEED_SOURCE.url,
          sourceLicense: SEED_SOURCE.license,
          sourceAuthor: sp.sourceAuthor ?? null,
          seeded: true,
        },
      },
    );
    idByName.set(sp.name, created.id);
    promptsCreated++;
  }

  let collectionsCreated = 0;
  let collectionsSkipped = 0;
  for (const c of SEED_COLLECTIONS) {
    const existing = await db.collection("collections").findOne({ ownerEmail, name: c.name });
    if (existing) {
      collectionsSkipped++;
      continue;
    }
    const { id } = await createCollection(db, ownerEmail, { name: c.name, description: c.description });
    for (const pname of c.prompts) {
      const pid = idByName.get(pname);
      if (pid) await addPromptToCollection(db, id, ownerEmail, pid);
    }
    collectionsCreated++;
  }

  return { ownerEmail, promptsCreated, promptsSkipped, collectionsCreated, collectionsSkipped };
}
