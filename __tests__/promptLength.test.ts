import { lengthLabel, cardLengthBadge } from "../lib/promptLength";

describe("lengthLabel", () => {
  it("classifies by token estimate into Short / Medium / Long", () => {
    expect(lengthLabel(10)?.label).toBe("Short");
    expect(lengthLabel(100)?.label).toBe("Short");
    expect(lengthLabel(300)?.label).toBe("Medium");
    expect(lengthLabel(800)?.label).toBe("Long");
    expect(lengthLabel(5000)?.label).toBe("Long");
  });

  it("boundary values land in the expected bucket", () => {
    // ≤150 Short, ≤600 Medium, else Long
    expect(lengthLabel(150)?.label).toBe("Short");
    expect(lengthLabel(151)?.label).toBe("Medium");
    expect(lengthLabel(600)?.label).toBe("Medium");
    expect(lengthLabel(601)?.label).toBe("Long");
  });

  it("returns null for zero / missing / negative tokens (nothing to show)", () => {
    expect(lengthLabel(0)).toBeNull();
    expect(lengthLabel(undefined)).toBeNull();
    expect(lengthLabel(-5)).toBeNull();
  });

  it("carries the token count through for the tooltip", () => {
    expect(lengthLabel(250)?.tokens).toBe(250);
  });
});

describe("cardLengthBadge", () => {
  it("only surfaces the informative extremes (Short / Long), suppressing Medium", () => {
    // Medium is the unremarkable middle most prompts fall into — a chip reading
    // "Medium" on every card is noise, so cards skip it.
    expect(cardLengthBadge(300)).toBeNull(); // Medium → hidden
    expect(cardLengthBadge(151)).toBeNull();
    expect(cardLengthBadge(600)).toBeNull();
    expect(cardLengthBadge(100)?.label).toBe("Short");
    expect(cardLengthBadge(800)?.label).toBe("Long");
  });

  it("returns null for zero / missing tokens, like lengthLabel", () => {
    expect(cardLengthBadge(0)).toBeNull();
    expect(cardLengthBadge(undefined)).toBeNull();
  });

  it("carries the token count through for Short / Long", () => {
    expect(cardLengthBadge(80)?.tokens).toBe(80);
    expect(cardLengthBadge(900)?.tokens).toBe(900);
  });
});
