import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || "promptinghub").collection("prompts");
await col.deleteMany({});
await col.insertMany([
  { name: "Summarize", description: "Summarize any text concisely.", body: "Summarize the following text in 3 bullet points: <TEXT>" },
  { name: "Translate PL", description: "Translate any text to Polish.", body: "Translate the following text to Polish: <TEXT>" },
  { name: "Code review", description: "Review code for bugs and style.", body: "Review the following code for bugs, style, and performance: <CODE>" },
  { name: "Explain like I'm 5", description: "Simplify a concept for a child.", body: "Explain <CONCEPT> like I am 5 years old." },
  { name: "SQL builder", description: "Generate SQL from natural language.", body: "Write a SQL query that <REQUEST>. Use standard ANSI SQL." },
]);
console.log("seeded:", await col.countDocuments());
await client.close();
