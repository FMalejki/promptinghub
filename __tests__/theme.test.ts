import { resolveTheme, THEME_INIT_SCRIPT } from "../lib/theme";

describe("resolveTheme", () => {
  it("honors an explicit stored preference over the OS", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to the OS preference when nothing is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme(undefined, true)).toBe("dark");
  });

  it("ignores a junk stored value and uses the OS preference", () => {
    expect(resolveTheme("banana", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("only ever ADDS the dark class (never removes) and is self-contained", () => {
    // Must not strip a class — removing would cause a flash; the script is
    // additive and the React provider owns toggling thereafter.
    expect(THEME_INIT_SCRIPT).toContain("classList.add('dark')");
    expect(THEME_INIT_SCRIPT).not.toContain("classList.remove");
    // Wrapped in try/catch so a storage exception can never blank the page.
    expect(THEME_INIT_SCRIPT).toContain("try");
    expect(THEME_INIT_SCRIPT).toContain("catch");
  });
});
