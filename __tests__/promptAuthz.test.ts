import { isOwner, isCollaborator, canEditPrompt, canViewPrompt } from "../lib/promptAuthz";

const owner = "owner@x.com";
const collab = "collab@x.com";
const shared = "shared@x.com";
const stranger = "stranger@x.com";

const publicRow = { ownerEmail: owner, isPrivate: false };
const privateRow = {
  ownerEmail: owner,
  isPrivate: true,
  sharedWith: [shared],
  collaborators: [collab],
};

describe("promptAuthz", () => {
  describe("isOwner / isCollaborator (case-insensitive)", () => {
    it("matches owner regardless of case/whitespace", () => {
      expect(isOwner(privateRow, " Owner@X.com ")).toBe(true);
      expect(isOwner(privateRow, collab)).toBe(false);
      expect(isOwner(privateRow, null)).toBe(false);
    });
    it("matches collaborators case-insensitively", () => {
      expect(isCollaborator(privateRow, "Collab@X.com")).toBe(true);
      expect(isCollaborator(privateRow, shared)).toBe(false);
      expect(isCollaborator(publicRow, collab)).toBe(false); // no collaborators
    });
  });

  describe("canEditPrompt", () => {
    it("allows owner and collaborators, denies shared-viewer and strangers", () => {
      expect(canEditPrompt(privateRow, owner)).toBe(true);
      expect(canEditPrompt(privateRow, collab)).toBe(true);
      expect(canEditPrompt(privateRow, shared)).toBe(false); // read-only share ≠ edit
      expect(canEditPrompt(privateRow, stranger)).toBe(false);
      expect(canEditPrompt(privateRow, null)).toBe(false);
    });
    it("a collaborator on a public prompt can still edit", () => {
      const row = { ownerEmail: owner, isPrivate: false, collaborators: [collab] };
      expect(canEditPrompt(row, collab)).toBe(true);
    });
  });

  describe("canViewPrompt", () => {
    it("public prompts are visible to everyone (even anonymous)", () => {
      expect(canViewPrompt(publicRow, null)).toBe(true);
      expect(canViewPrompt(publicRow, stranger)).toBe(true);
    });
    it("private prompts: owner, shared, and collaborators can view; strangers cannot", () => {
      expect(canViewPrompt(privateRow, owner)).toBe(true);
      expect(canViewPrompt(privateRow, shared)).toBe(true);
      expect(canViewPrompt(privateRow, collab)).toBe(true);
      expect(canViewPrompt(privateRow, stranger)).toBe(false);
      expect(canViewPrompt(privateRow, null)).toBe(false);
    });
  });
});
