// Pure, framework-free authorization helpers for prompt access.
//
// Two distinct relationships beyond ownership:
//   - sharedWith   → may VIEW a private prompt (read-only)
//   - collaborators → may VIEW *and* EDIT the prompt (but not manage sharing,
//                     privacy, price, or delete — those stay owner-only)
//
// Centralizing the checks here keeps the view-gate (API GET) and the edit-gate
// (updatePrompt / edit page) consistent and unit-testable without a DB or RTL.

export type AuthzRow = {
  ownerEmail: string;
  isPrivate?: boolean | null;
  sharedWith?: string[] | null;
  collaborators?: string[] | null;
};

const norm = (e?: string | null): string => (e || "").trim().toLowerCase();
const listHas = (list: string[] | null | undefined, email: string): boolean =>
  !!email && (list || []).some((x) => norm(x) === email);

export function isOwner(row: AuthzRow, email?: string | null): boolean {
  const e = norm(email);
  return !!e && norm(row.ownerEmail) === e;
}

export function isCollaborator(row: AuthzRow, email?: string | null): boolean {
  return listHas(row.collaborators, norm(email));
}

/** Owner OR an explicit collaborator may edit content. */
export function canEditPrompt(row: AuthzRow, email?: string | null): boolean {
  return isOwner(row, email) || isCollaborator(row, email);
}

/** Public prompts are visible to anyone; private ones to owner/shared/collaborators. */
export function canViewPrompt(row: AuthzRow, email?: string | null): boolean {
  if (!row.isPrivate) return true;
  const e = norm(email);
  if (!e) return false;
  return isOwner(row, e) || isCollaborator(row, e) || listHas(row.sharedWith, e);
}
