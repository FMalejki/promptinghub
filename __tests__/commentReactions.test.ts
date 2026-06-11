import { isAllowedReaction, aggregateReactions, REACTION_EMOJIS } from "../lib/reactionEmojis";

describe("isAllowedReaction", () => {
  it("accepts only the fixed emoji set", () => {
    for (const e of REACTION_EMOJIS) expect(isAllowedReaction(e)).toBe(true);
    expect(isAllowedReaction("💩")).toBe(false);
    expect(isAllowedReaction("a")).toBe(false);
    expect(isAllowedReaction(undefined)).toBe(false);
    expect(isAllowedReaction(5)).toBe(false);
  });
});

describe("aggregateReactions", () => {
  const ids = ["c1", "c2"];

  it("counts per emoji and marks the viewer's own reactions", () => {
    const rows = [
      { commentId: "c1", email: "a@x.com", emoji: "👍" },
      { commentId: "c1", email: "b@x.com", emoji: "👍" },
      { commentId: "c1", email: "a@x.com", emoji: "🎉" },
      { commentId: "c2", email: "b@x.com", emoji: "❤️" },
    ];
    const agg = aggregateReactions(rows, ids, "a@x.com");
    expect(agg.c1.counts).toEqual({ "👍": 2, "🎉": 1 });
    expect(agg.c1.mine.sort()).toEqual(["👍", "🎉"].sort());
    expect(agg.c2.counts).toEqual({ "❤️": 1 });
    expect(agg.c2.mine).toEqual([]);
  });

  it("initializes every requested comment id with empty state", () => {
    const agg = aggregateReactions([], ids);
    expect(agg.c1).toEqual({ counts: {}, mine: [] });
    expect(agg.c2).toEqual({ counts: {}, mine: [] });
  });

  it("ignores disallowed emojis and unknown comment ids", () => {
    const rows = [
      { commentId: "c1", email: "a@x.com", emoji: "💩" },
      { commentId: "nope", email: "a@x.com", emoji: "👍" },
    ];
    const agg = aggregateReactions(rows, ids, "a@x.com");
    expect(agg.c1.counts).toEqual({});
    expect(agg).not.toHaveProperty("nope");
  });

  it("does not double-count the viewer's mine for the same emoji", () => {
    // defensive: duplicate rows shouldn't list the same emoji twice in `mine`
    const rows = [
      { commentId: "c1", email: "a@x.com", emoji: "👍" },
      { commentId: "c1", email: "a@x.com", emoji: "👍" },
    ];
    const agg = aggregateReactions(rows, ["c1"], "a@x.com");
    expect(agg.c1.mine).toEqual(["👍"]);
  });
});
