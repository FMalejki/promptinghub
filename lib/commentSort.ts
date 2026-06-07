// Pure ordering for top-level comments. Replies stay grouped under their parent
// in the UI, so only the roots need ordering.

export type SortMode = "newest" | "top";
export type SortableComment = { id: string; parentId: string | null; createdAt: string; likeCount?: number };

const byNewest = (a: SortableComment, b: SortableComment) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export function sortRoots<T extends SortableComment>(roots: T[], mode: SortMode): T[] {
  const copy = [...roots];
  if (mode === "top") {
    copy.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0) || byNewest(a, b));
  } else {
    copy.sort(byNewest);
  }
  return copy;
}
