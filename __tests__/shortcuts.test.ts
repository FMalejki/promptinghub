import { SHORTCUTS, isHelpTrigger, isSearchFocusTrigger } from "../lib/shortcuts";

const ev = (key: string, tag = "BODY", extra: Partial<{ metaKey: boolean; ctrlKey: boolean }> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  ...extra,
  target: { tagName: tag, isContentEditable: false },
});

describe("isHelpTrigger", () => {
  it("opens on '?' outside of inputs", () => {
    expect(isHelpTrigger(ev("?"))).toBe(true);
  });

  it("ignores '?' typed into an input or textarea", () => {
    expect(isHelpTrigger(ev("?", "INPUT"))).toBe(false);
    expect(isHelpTrigger(ev("?", "TEXTAREA"))).toBe(false);
  });

  it("ignores '?' in a contentEditable element", () => {
    const e = { key: "?", metaKey: false, ctrlKey: false, target: { tagName: "DIV", isContentEditable: true } };
    expect(isHelpTrigger(e)).toBe(false);
  });

  it("ignores other keys and modified '?'", () => {
    expect(isHelpTrigger(ev("a"))).toBe(false);
    expect(isHelpTrigger(ev("?", "BODY", { metaKey: true }))).toBe(false);
    expect(isHelpTrigger(ev("?", "BODY", { ctrlKey: true }))).toBe(false);
  });

  it("is tolerant of a missing target", () => {
    expect(isHelpTrigger({ key: "?", metaKey: false, ctrlKey: false })).toBe(true);
  });
});

describe("isSearchFocusTrigger", () => {
  it("triggers on '/' outside of inputs", () => {
    expect(isSearchFocusTrigger(ev("/"))).toBe(true);
  });

  it("ignores '/' typed into an input, textarea or contentEditable", () => {
    expect(isSearchFocusTrigger(ev("/", "INPUT"))).toBe(false);
    expect(isSearchFocusTrigger(ev("/", "TEXTAREA"))).toBe(false);
    expect(isSearchFocusTrigger({ key: "/", target: { tagName: "DIV", isContentEditable: true } })).toBe(false);
  });

  it("ignores other keys and modified '/'", () => {
    expect(isSearchFocusTrigger(ev("a"))).toBe(false);
    expect(isSearchFocusTrigger(ev("/", "BODY", { metaKey: true }))).toBe(false);
    expect(isSearchFocusTrigger(ev("/", "BODY", { ctrlKey: true }))).toBe(false);
  });

  it("is tolerant of a missing target", () => {
    expect(isSearchFocusTrigger({ key: "/", metaKey: false, ctrlKey: false })).toBe(true);
  });
});

describe("SHORTCUTS", () => {
  it("lists at least the command palette and help shortcuts", () => {
    const keys = SHORTCUTS.map((s) => s.keys.join("+").toLowerCase());
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(2);
    expect(keys.some((k) => k.includes("k"))).toBe(true);
    expect(SHORTCUTS.every((s) => s.label && s.keys.length > 0)).toBe(true);
  });
});
