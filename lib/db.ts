import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "promptinghub";

let clientPromise: Promise<MongoClient> | null = null;

export function getDb(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI not set");
  if (!clientPromise) clientPromise = new MongoClient(uri).connect();
  return clientPromise.then((c) => c.db(dbName));
}
