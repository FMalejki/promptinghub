import { Db } from "mongodb";
import { listFollowingHandles } from "./follows";
import { listFollowedTags } from "./tagFollows";
import { listSubscribedCollectionIds, } from "./collectionFollows";
import { getCollection } from "./collections";

// Everything the signed-in user follows, for a "Following" management page:
// creator handles, followed tags, and subscribed collections (resolved to
// {id,name}, silently dropping any that were since deleted).
export type FollowingSummary = {
  creators: string[];
  tags: string[];
  collections: { id: string; name: string }[];
};

export async function getFollowingSummary(db: Db, email: string): Promise<FollowingSummary> {
  const [creators, tags, collectionIds] = await Promise.all([
    listFollowingHandles(db, email),
    listFollowedTags(db, email),
    listSubscribedCollectionIds(db, email),
  ]);

  const collections: { id: string; name: string }[] = [];
  for (const id of collectionIds) {
    const c = await getCollection(db, id);
    if (c) collections.push({ id: c.id, name: c.name });
  }

  return { creators, tags, collections };
}
