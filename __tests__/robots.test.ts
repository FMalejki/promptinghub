import robots, { DISALLOW } from "../app/robots";

// Public, indexable routes that must NEVER end up disallowed (and must not be
// blocked by an over-broad prefix).
const PUBLIC_ROUTES = [
  "/",
  "/browse",
  "/trending",
  "/categories",
  "/collections",
  "/creators",
  "/random",
  "/sitemap.xml",
  "/llms.txt",
  "/p/ada/code-reviewer",
  "/u/ada",
  "/t/marketing",
  "/c/writing",
  "/prompt/abc123",
  "/embed/abc123",
];

function isBlocked(path: string): boolean {
  return DISALLOW.some((rule) => path.startsWith(rule));
}

describe("robots", () => {
  it("keeps personal / auth-gated surfaces out of the index", () => {
    for (const p of ["/dashboard", "/favorites", "/following", "/notifications", "/settings", "/new", "/login"]) {
      expect(isBlocked(p)).toBe(true);
    }
  });

  it("never blocks a public, indexable route via an over-broad prefix", () => {
    for (const p of PUBLIC_ROUTES) {
      expect(isBlocked(p)).toBe(false);
    }
  });

  it("points crawlers at the sitemap", () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("exposes a single wildcard user-agent rule", () => {
    const rules = robots().rules;
    expect(Array.isArray(rules) ? rules[0].userAgent : rules.userAgent).toBe("*");
  });
});
