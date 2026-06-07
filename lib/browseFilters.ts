// Whether the browse view has any active search/filter, so an empty result can
// offer "clear filters" vs. "be the first to add one".

export type BrowseFilters = { q?: string; category?: string | null; tag?: string | null; imageOnly?: boolean };

export function hasActiveFilters(f: BrowseFilters): boolean {
  return !!(f.q && f.q.trim()) || !!f.category || !!f.tag || !!f.imageOnly;
}
