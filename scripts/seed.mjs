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
  { email: "alice@example.com", passwordHash, createdAt: new Date() },
  { email: "bob@example.com", passwordHash, createdAt: new Date() },
];
await users.insertMany(accounts);

const seed = [
  // alice — writer + coder
  { ownerEmail: "alice@example.com", category: "Writing",      name: "Summarize",          description: "Summarize any text in 3 bullets.",         body: "Summarize the following text in 3 bullets: <TEXT>" },
  { ownerEmail: "alice@example.com", category: "Writing",      name: "Polish translator",  description: "Translate any text to natural Polish.",    body: "Translate to Polish, preserving tone: <TEXT>" },
  { ownerEmail: "alice@example.com", category: "Writing",      name: "Headline writer",    description: "10 catchy headlines for an article.",      body: "Write 10 catchy headlines about <TOPIC>." },
  { ownerEmail: "alice@example.com", category: "Coding",       name: "Code review",        description: "Review code for bugs and style.",          body: "Review the following code for bugs, style, and performance: <CODE>" },
  { ownerEmail: "alice@example.com", category: "Coding",       name: "Regex builder",      description: "Generate a regex from a description.",     body: "Write a regex that matches: <REQUEST>. Explain it." },
  { ownerEmail: "alice@example.com", category: "Productivity", name: "Meeting summary",    description: "Turn a transcript into action items.",     body: "Summarize this meeting transcript into action items, owners, deadlines: <TRANSCRIPT>" },
  { ownerEmail: "alice@example.com", category: "Productivity", name: "Weekly plan",        description: "Plan a focused week from a goal list.",    body: "Plan a 5-day work week to make progress on: <GOALS>" },
  // bob — marketer + learner
  { ownerEmail: "bob@example.com",   category: "Marketing",    name: "Tweet thread",       description: "Turn an idea into a 7-tweet thread.",      body: "Write a 7-tweet thread on: <IDEA>. Hook, story, CTA." },
  { ownerEmail: "bob@example.com",   category: "Marketing",    name: "Cold email",         description: "Short cold outreach email to a prospect.",  body: "Write a 90-word cold email pitching <PRODUCT> to <PERSONA>." },
  { ownerEmail: "bob@example.com",   category: "Marketing",    name: "Landing page hero",  description: "Write the headline + subhead for a hero.",  body: "Write a hero headline + subhead + CTA for <PRODUCT>. 3 variants." },
  { ownerEmail: "bob@example.com",   category: "Learning",     name: "Explain like I'm 5", description: "Simplify a concept for a child.",          body: "Explain <CONCEPT> like I am 5 years old." },
  { ownerEmail: "bob@example.com",   category: "Learning",     name: "Flashcards",         description: "Generate flashcards from notes.",          body: "Make 10 Q/A flashcards from these notes: <NOTES>" },
  { ownerEmail: "bob@example.com",   category: "Fun",          name: "Dad joke",           description: "Tell a clean dad joke about a topic.",     body: "Tell me 3 clean dad jokes about <TOPIC>." },
];
await prompts.insertMany(seed);

console.log("seeded:", {
  users: await users.countDocuments(),
  prompts: await prompts.countDocuments(),
  logins: "alice@example.com / bob@example.com — password: password123",
});
await client.close();
