import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getFavorites } from "@/lib/prompts";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const favoriteIds = await getFavorites(db, email);

  // Get full prompt details for favorites
  const prompts = await db
    .collection("prompts")
    .aggregate([
      { $match: { _id: { $in: favoriteIds.map((id) => new ObjectId(id)) } } },
      { $addFields: { stars: { $size: { $ifNull: ["$starredBy", []] } } } },
      { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  const result = prompts.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    image: r.image ?? null,
    stars: r.stars || 0,
    isPrivate: r.isPrivate || false,
    testedModels: r.testedModels || [],
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));

  return NextResponse.json({ prompts: result });
}

// Made with Bob
