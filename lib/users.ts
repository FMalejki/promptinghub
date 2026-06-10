import { Db } from "mongodb";
import bcrypt from "bcryptjs";
import { slugify } from "./slug";
import { isVerifiedHandle } from "./verified";
import { sanitizeMutedTypes } from "./notifications";

export type User = { id: string; email: string; name: string; image: string | null };
export type ProfileLinks = { website: string | null; x: string | null; github: string | null };
// mutedNotificationTypes is private: only ever populated by getProfile (self view).
export type Profile = { email: string; name: string; image: string | null; bio: string | null; mutedNotificationTypes?: string[] } & ProfileLinks;
export type Creator = Profile & { handle: string; verified: boolean };

// Pick a unique @handle derived from an email's local part. Falls back to "user"
// when the local part slugifies to empty (e.g. all-symbol addresses).
async function uniqueHandle(db: Db, email: string): Promise<string> {
  const users = db.collection("users");
  const base = slugify(email.split("@")[0]) || "user";
  let handle = base;
  for (let n = 2; await users.findOne({ handle }); n++) handle = `${base}-${n}`;
  return handle;
}

// Returns the user's stable @handle, generating + persisting a unique one on first call.
export async function ensureHandle(db: Db, email: string): Promise<string> {
  const users = db.collection("users");
  const row = await users.findOne({ email });
  if (!row) throw new Error("User not found");
  if (row.handle) return row.handle as string;

  const handle = await uniqueHandle(db, email);
  await users.updateOne({ email }, { $set: { handle } });
  return handle;
}

function profileFields(row: any) {
  return {
    bio: row.bio ?? null,
    website: row.website ?? null,
    x: row.x ?? null,
    github: row.github ?? null,
  };
}

export async function getUserByHandle(db: Db, handle: string): Promise<(Profile & { handle: string }) | null> {
  const row = await db.collection("users").findOne({ handle });
  return row ? { email: row.email, name: row.name, image: row.image ?? null, handle: row.handle, ...profileFields(row) } : null;
}

export type MentionSuggestion = { handle: string; name: string; image: string | null };

// Typeahead for @mention autocomplete: users (with a handle) whose handle starts
// with the query OR whose display name contains it (case-insensitive). This is
// what lets someone type "@fmalejki" and find "FMalejki (@filipmalejki)" — the
// handle and the display name often differ. Returns public-safe fields only.
export async function searchUsersForMention(db: Db, q: string, limit = 6): Promise<MentionSuggestion[]> {
  const term = (q || "").trim();
  if (!term) return [];
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const handlePrefix = new RegExp("^" + esc, "i");
  const nameContains = new RegExp(esc, "i");
  const rows = await db
    .collection("users")
    .find(
      { handle: { $exists: true, $ne: null }, $or: [{ handle: handlePrefix }, { name: nameContains }] },
      { projection: { handle: 1, name: 1, image: 1, _id: 0 }, limit: Math.max(1, Math.min(limit, 25)) },
    )
    .toArray();
  return rows.map((r: any) => ({ handle: r.handle as string, name: (r.name as string) || (r.handle as string), image: r.image ?? null }));
}

// Exact-handle lookup for the @mention confirmation indicator: given the handles
// parsed out of a draft comment, return the ones that map to a real user (so the
// composer can show "✓ @handle will be notified"). Handles are matched
// case-insensitively; input is capped to keep the $in bounded.
export async function getUsersByHandles(db: Db, handles: string[]): Promise<MentionSuggestion[]> {
  const wanted = Array.from(new Set((handles || []).map((h) => (h || "").trim().toLowerCase()).filter(Boolean))).slice(0, 20);
  if (wanted.length === 0) return [];
  const rows = await db
    .collection("users")
    .find(
      { handle: { $in: wanted } },
      { projection: { handle: 1, name: 1, image: 1, _id: 0 } },
    )
    .toArray();
  return rows.map((r: any) => ({ handle: r.handle as string, name: (r.name as string) || (r.handle as string), image: r.image ?? null }));
}

export type TopCreator = {
  handle: string;
  name: string;
  image: string | null;
  verified: boolean;
  prompts: number;
  stars: number;
  followers: number;
};

// Leaderboard of creators (must have a handle), ranked by followers*3 + stars + prompts.
export async function topCreators(db: Db, limit = 20): Promise<TopCreator[]> {
  // Public prompt counts + star sums per owner.
  const promptAgg = await db
    .collection("prompts")
    .aggregate([
      { $match: { isPrivate: { $ne: true } } },
      { $group: { _id: "$ownerEmail", prompts: { $sum: 1 }, stars: { $sum: { $size: { $ifNull: ["$starredBy", []] } } } } },
    ])
    .toArray();
  if (!promptAgg.length) return [];

  // Follower counts per creator email.
  const followAgg = await db.collection("follows").aggregate([{ $group: { _id: "$targetEmail", n: { $sum: 1 } } }]).toArray();
  const followersByEmail = new Map(followAgg.map((f: any) => [f._id as string, f.n as number]));

  const emails = promptAgg.map((p: any) => p._id as string);
  const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
  const userByEmail = new Map(users.map((u) => [u.email, u]));

  const creators: TopCreator[] = [];
  for (const p of promptAgg as any[]) {
    const u = userByEmail.get(p._id);
    if (!u?.handle) continue; // only creators with a public handle
    const followers = followersByEmail.get(p._id) || 0;
    creators.push({
      handle: u.handle,
      name: u.name || (p._id as string).split("@")[0],
      image: u.image ?? null,
      verified: isVerifiedHandle(u.handle),
      prompts: p.prompts,
      stars: p.stars,
      followers,
    });
  }

  const score = (c: TopCreator) => c.followers * 3 + c.stars + c.prompts;
  return creators.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).slice(0, limit);
}

// True only when the account's handle is a verified one (used to gate curation).
export async function isVerifiedEmail(db: Db, email: string): Promise<boolean> {
  const row = await db.collection("users").findOne({ email });
  return !!row?.handle && isVerifiedHandle(row.handle);
}

// Public creator profile resolved by handle, with verified flag. Null if unknown.
export async function getCreatorProfile(db: Db, handle: string): Promise<Creator | null> {
  const u = await getUserByHandle(db, handle);
  if (!u) return null;
  return { ...u, verified: isVerifiedHandle(u.handle) };
}

export type CreatorStats = { joinedAt: Date | null; totalViews: number; totalCopies: number };

// Aggregate public-facing stats for a creator (by email): join date and the
// summed views/copies across their public prompts. Unknown creator → zeros.
export async function creatorStats(db: Db, email: string): Promise<CreatorStats> {
  const user = await db.collection("users").findOne({ email }, { projection: { createdAt: 1 } });
  const agg = await db
    .collection("prompts")
    .aggregate([
      { $match: { ownerEmail: email, isPrivate: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: { $ifNull: ["$viewCount", 0] } },
          totalCopies: { $sum: { $ifNull: ["$copyCount", 0] } },
        },
      },
    ])
    .toArray();
  const row = agg[0];
  return {
    joinedAt: user?.createdAt ?? null,
    totalViews: row?.totalViews ?? 0,
    totalCopies: row?.totalCopies ?? 0,
  };
}

export async function createUser(db: Db, email: string, password: string, name?: string): Promise<User> {
  const users = db.collection("users");
  if (await users.findOne({ email })) throw new Error("User already exists");
  const displayName = name?.trim() || email.split("@")[0];
  const passwordHash = await bcrypt.hash(password, 10);
  // Assign a stable @handle at creation so the user has a working /u/<handle>
  // profile and can be @mentioned immediately (mentions resolve by handle).
  const handle = await uniqueHandle(db, email);
  const { insertedId } = await users.insertOne({ email, passwordHash, name: displayName, image: null, handle, createdAt: new Date() });
  return { id: insertedId.toString(), email, name: displayName, image: null };
}

export async function verifyCredentials(db: Db, email: string, password: string): Promise<User | null> {
  const row = await db.collection("users").findOne({ email });
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  return ok ? { id: row._id.toString(), email: row.email, name: row.name, image: row.image ?? null } : null;
}

export async function getProfile(db: Db, email: string): Promise<Profile | null> {
  const row = await db.collection("users").findOne({ email });
  if (!row) return null;
  // mutedNotificationTypes is returned only here (the signed-in self view), never
  // via profileFields / public creator profiles — it's a private preference.
  return {
    email: row.email,
    name: row.name,
    image: row.image ?? null,
    ...profileFields(row),
    mutedNotificationTypes: Array.isArray(row.mutedNotificationTypes) ? row.mutedNotificationTypes : [],
  };
}

export type ProfilePatch = {
  name?: string;
  image?: string | null;
  bio?: string | null;
  website?: string | null;
  x?: string | null;
  github?: string | null;
  mutedNotificationTypes?: string[];
};

export async function updateProfile(db: Db, email: string, patch: ProfilePatch): Promise<Profile | null> {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.image !== undefined) set.image = patch.image;
  if (patch.bio !== undefined) set.bio = patch.bio || null;
  if (patch.website !== undefined) set.website = patch.website || null;
  if (patch.x !== undefined) set.x = patch.x || null;
  if (patch.github !== undefined) set.github = patch.github || null;
  if (patch.mutedNotificationTypes !== undefined) set.mutedNotificationTypes = sanitizeMutedTypes(patch.mutedNotificationTypes);
  await db.collection("users").updateOne({ email }, { $set: set });
  return getProfile(db, email);
}

export type ExportedPrompt = {
  name: string;
  description: string;
  category: string;
  body: string;
  files: unknown;
  tags: string[];
  isPrivate: boolean;
  priceCents: number;
  copyCount: number;
  createdAt: Date;
};
export type ExportedCollection = { name: string; description: string; slug: string; promptIds: string[]; createdAt: Date };
export type AccountExport = {
  email: string;
  profile: { email: string; name: string; image: string | null; handle: string | null; createdAt: Date | null };
  prompts: ExportedPrompt[];
  collections: ExportedCollection[];
  exportedAt: Date;
};

/**
 * A portable, sanitized snapshot of everything an account owns — for a
 * "download my data" button. Never includes the password hash. Returns null
 * if the account is unknown.
 */
export async function exportAccountData(db: Db, email: string): Promise<AccountExport | null> {
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const promptRows = await db.collection("prompts").find({ ownerEmail: email }).sort({ createdAt: 1 }).toArray();
  const collectionRows = await db.collection("collections").find({ ownerEmail: email }).sort({ createdAt: 1 }).toArray();

  return {
    email,
    profile: {
      email: user.email,
      name: user.name ?? email.split("@")[0],
      image: user.image ?? null,
      handle: user.handle ?? null,
      createdAt: user.createdAt ?? null,
    },
    prompts: promptRows.map((p) => ({
      name: p.name,
      description: p.description,
      category: p.category,
      body: p.body ?? "",
      files: p.files ?? null,
      tags: p.tags ?? [],
      isPrivate: !!p.isPrivate,
      priceCents: p.priceCents ?? 0,
      copyCount: p.copyCount ?? 0,
      createdAt: p.createdAt,
    })),
    collections: collectionRows.map((c) => ({
      name: c.name,
      description: c.description ?? "",
      slug: c.slug,
      promptIds: c.promptIds ?? [],
      createdAt: c.createdAt,
    })),
    exportedAt: new Date(),
  };
}

export type DeleteAccountSummary = { prompts: number; collections: number; comments: number; apiKeys: number };

/**
 * Permanently delete an account and everything it owns: prompts (+ their version
 * snapshots), collections, comments, API keys, and the user record. Also pulls
 * the user out of every other prompt's starredBy / sharedWith. Favorites live on
 * the user doc and go with it. Returns counts, or null if the account is unknown.
 */
export async function deleteAccount(db: Db, email: string): Promise<DeleteAccountSummary | null> {
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const ownedPrompts = await db.collection("prompts").find({ ownerEmail: email }, { projection: { _id: 1 } }).toArray();
  const promptIds = ownedPrompts.map((p) => p._id.toString());
  if (promptIds.length) {
    await db.collection("promptVersions").deleteMany({ promptId: { $in: promptIds } });
  }

  const prompts = (await db.collection("prompts").deleteMany({ ownerEmail: email })).deletedCount || 0;
  const collections = (await db.collection("collections").deleteMany({ ownerEmail: email })).deletedCount || 0;
  const comments = (await db.collection("comments").deleteMany({ authorEmail: email })).deletedCount || 0;
  const apiKeys = (await db.collection("apiKeys").deleteMany({ ownerEmail: email })).deletedCount || 0;

  // Remove this user from other people's prompts (stars + shares).
  await db.collection("prompts").updateMany(
    { $or: [{ starredBy: email }, { sharedWith: email }] },
    { $pull: { starredBy: email, sharedWith: email } } as any,
  );

  await db.collection("users").deleteOne({ email });
  return { prompts, collections, comments, apiKeys };
}
