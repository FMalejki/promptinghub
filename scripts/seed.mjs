import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || "promptinghub");

const users = db.collection("users");
const prompts = db.collection("prompts");
await users.deleteMany({});
await prompts.deleteMany({});

const passwordHash = await bcrypt.hash("password123", 10);
const accounts = [
  { email: "alice@example.com", passwordHash, name: "Alice Nowak", image: "https://i.pravatar.cc/150?u=alice@example.com", createdAt: new Date() },
  { email: "bob@example.com", passwordHash, name: "Bob Kowalski", image: null, createdAt: new Date() },
];
await users.insertMany(accounts);

const base = Date.now();
const seed = [
  // alice — writer + coder
  {
    ownerEmail: "alice@example.com",
    category: "Writing",
    name: "Summarize",
    description: "Summarize any text in 3 bullets.",
    body: "Summarize the following text in 3 bullets: <TEXT>",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: [],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4", version: "gpt-4-0125-preview" },
      { modelId: "claude-3-opus" }
    ]
  },
  {
    ownerEmail: "alice@example.com",
    category: "Writing",
    name: "Polish translator",
    description: "Translate any text to natural Polish.",
    body: "Translate to Polish, preserving tone: <TEXT>",
    image: null,
    isPrivate: false,
    starredBy: [],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4-turbo" },
      { modelId: "claude-3-sonnet" }
    ]
  },
  {
    ownerEmail: "alice@example.com",
    category: "Writing",
    name: "Headline writer",
    description: "10 catchy headlines for an article.",
    body: "Write 10 catchy headlines about <TOPIC>.",
    image: "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: ["bob@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-3.5-turbo", notes: "Works well with temperature 0.8" }
    ]
  },
  {
    ownerEmail: "alice@example.com",
    category: "Coding",
    name: "Code review",
    description: "Review code for bugs and style.",
    body: "Review the following code for bugs, style, and performance: <CODE>",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: ["bob@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4", version: "gpt-4-0125-preview", notes: "Best for detailed reviews" },
      { modelId: "claude-3-opus" }
    ]
  },
  {
    ownerEmail: "alice@example.com",
    category: "Coding",
    name: "Regex builder",
    description: "Generate a regex from a description.",
    body: "Write a regex that matches: <REQUEST>. Explain it.",
    image: null,
    isPrivate: false,
    starredBy: [],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4" },
      { modelId: "codex" }
    ]
  },
  {
    ownerEmail: "alice@example.com",
    category: "Productivity",
    name: "Meeting summary",
    description: "Turn a transcript into action items.",
    body: "Summarize this meeting transcript into action items, owners, deadlines: <TRANSCRIPT>",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: ["bob@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4-turbo" },
      { modelId: "claude-3-sonnet" }
    ]
  },
  {
    ownerEmail: "alice@example.com",
    category: "Productivity",
    name: "Weekly plan",
    description: "Plan a focused week from a goal list.",
    body: "Plan a 5-day work week to make progress on: <GOALS>",
    image: null,
    isPrivate: true,
    starredBy: [],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4" }
    ]
  },
  // bob — marketer + learner
  {
    ownerEmail: "bob@example.com",
    category: "Marketing",
    name: "Tweet thread",
    description: "Turn an idea into a 7-tweet thread.",
    body: "Write a 7-tweet thread on: <IDEA>. Hook, story, CTA.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: ["alice@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4", notes: "Great for creative content" },
      { modelId: "claude-3-opus" }
    ]
  },
  {
    ownerEmail: "bob@example.com",
    category: "Marketing",
    name: "Cold email",
    description: "Short cold outreach email to a prospect.",
    body: "Write a 90-word cold email pitching <PRODUCT> to <PERSONA>.",
    image: null,
    isPrivate: false,
    starredBy: ["alice@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-3.5-turbo" },
      { modelId: "claude-3-haiku" }
    ]
  },
  {
    ownerEmail: "bob@example.com",
    category: "Marketing",
    name: "Landing page hero",
    description: "Write the headline + subhead for a hero.",
    body: "Write a hero headline + subhead + CTA for <PRODUCT>. 3 variants.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: ["alice@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4" }
    ]
  },
  {
    ownerEmail: "bob@example.com",
    category: "Learning",
    name: "Explain like I'm 5",
    description: "Simplify a concept for a child.",
    body: "Explain <CONCEPT> like I am 5 years old.",
    image: null,
    isPrivate: false,
    starredBy: [],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4" },
      { modelId: "claude-3-sonnet", notes: "Very good at simple explanations" }
    ]
  },
  {
    ownerEmail: "bob@example.com",
    category: "Learning",
    name: "Flashcards",
    description: "Generate flashcards from notes.",
    body: "Make 10 Q/A flashcards from these notes: <NOTES>",
    image: null,
    isPrivate: false,
    starredBy: [],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-3.5-turbo" }
    ]
  },
  {
    ownerEmail: "bob@example.com",
    category: "Fun",
    name: "Dad joke",
    description: "Tell a clean dad joke about a topic.",
    body: "Tell me 3 clean dad jokes about <TOPIC>.",
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=300&fit=crop",
    isPrivate: false,
    starredBy: ["alice@example.com"],
    sharedWith: [],
    testedModels: [
      { modelId: "gpt-4", notes: "Surprisingly good at humor!" }
    ]
  },
];
await prompts.insertMany(seed.map((p, i) => ({ ...p, createdAt: new Date(base + i * 1000) })));

console.log("seeded:", {
  users: await users.countDocuments(),
  prompts: await prompts.countDocuments(),
  logins: "alice@example.com / bob@example.com — password: password123",
});
await client.close();
