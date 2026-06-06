import { MongoClient } from "mongodb";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);

const client = await new MongoClient(env.MONGODB_URI).connect();
const db = client.db(env.MONGODB_DB || "promptinghub");

const name = "Cold outreach email (template)";
await db.collection("prompts").deleteMany({ name });
await db.collection("prompts").insertOne({
  ownerEmail: "bob@x.com",
  name,
  description: "Personalized B2B cold email with fill-in-the-blank variables.",
  category: "Marketing",
  files: [
    {
      path: "email.md",
      content:
        "Write a short, friendly cold outreach email.\n\n" +
        "To: {{recipient_name}} at {{company}}\n" +
        "From: {{sender_name}}\n" +
        "Goal: book a {{meeting_length:15-minute}} call.\n\n" +
        "Value proposition: {{value_prop}}\n" +
        "Tone: {{tone:warm and concise}}\n\n" +
        "Keep it under 120 words and end with a clear call to action.",
      language: "markdown",
    },
  ],
  createdAt: new Date(),
});

const row = await db.collection("prompts").findOne({ name });
console.log("inserted id:", row._id.toString());
await client.close();
