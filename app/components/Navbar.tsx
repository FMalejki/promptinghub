"use client";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "../ThemeProvider";
import { Avatar } from "../Avatar";
import { NotificationBell } from "./NotificationBell";

type NavLink = { href: string; label: string; authOnly?: boolean; group: "primary" | "explore" };

const NAV_LINKS: NavLink[] = [
  { href: "/browse", label: "Browse", group: "primary" },
  { href: "/templates", label: "Templates", group: "primary" },
  { href: "/feed", label: "Feed", authOnly: true, group: "primary" },
  { href: "/dashboard", label: "Dashboard", authOnly: true, group: "primary" },
  { href: "/trending", label: "Trending", group: "primary" },
  { href: "/categories", label: "Categories", group: "explore" },
  { href: "/tags", label: "Tags", group: "explore" },
  { href: "/collections", label: "Collections", group: "explore" },
  { href: "/creators", label: "Creators", group: "explore" },
  // Feedback intentionally lives OUTSIDE this list: it gets its own always-visible
  // button in the right-side actions (desktop) + a dedicated mobile entry, so it's
  // never buried in the Explore dropdown.
];

export function Navbar() {
  const { status, data } = useSession();
  const { theme, toggleTheme } = useTheme();
  const authed = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const links = NAV_LINKS.filter((l) => !l.authOnly || authed);
  const primaryLinks = links.filter((l) => l.group === "primary");
  const exploreLinks = links.filter((l) => l.group === "explore");
  const linkClass =
    "px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors";

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity" onClick={() => setMobileOpen(false)}>
            <img src="/static/image.png" alt="PromptingHub Logo" className="w-8 h-8 shrink-0 object-contain" />
            <span className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white whitespace-nowrap">PromptingHub</span>
          </Link>

          {/* Primary nav (desktop) */}
          <div className="hidden lg:flex items-center gap-1 ml-6">
            {primaryLinks.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}

            {/* Explore dropdown — secondary destinations, collapsed to de-clutter. */}
            <div className="relative">
              <button
                onClick={() => setExploreOpen((o) => !o)}
                className={`${linkClass} flex items-center gap-1`}
                aria-haspopup="true"
                aria-expanded={exploreOpen}
              >
                Explore
                <svg className={`w-3.5 h-3.5 transition-transform ${exploreOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exploreOpen && (
                <>
                  {/* click-away backdrop */}
                  <button
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setExploreOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 mt-1 w-44 z-50 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                    {exploreLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setExploreOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Feedback — always visible so users can speak up from any page. */}
            <Link
              href="/feedback"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8a9 9 0 110-18 9 9 0 010 18zm0 0l-4-1-1 1 1-4" />
              </svg>
              Feedback
            </Link>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {authed ? (
              <>
                {/* Add Prompt Button */}
                <Link
                  href="/new"
                  className="hidden lg:flex shrink-0 items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Prompt
                </Link>

                {/* User menu (desktop): bell + a single avatar dropdown so the
                    bar stays compact and never overflows on narrow desktops. */}
                <div className="hidden lg:flex items-center gap-2">
                  <NotificationBell />
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen((o) => !o)}
                      className="flex items-center rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-haspopup="true"
                      aria-expanded={userMenuOpen}
                      aria-label="Account menu"
                    >
                      {data?.user?.image ? (
                        <img src={data.user.image} alt={data.user.name || "User"} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                      ) : (
                        <Avatar name={data?.user?.name || ""} image={data?.user?.image} size={32} />
                      )}
                    </button>
                    {userMenuOpen && (
                      <>
                        <button aria-hidden tabIndex={-1} onClick={() => setUserMenuOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                        <div className="absolute right-0 mt-2 w-52 z-50 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                          {data?.user?.name && (
                            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 truncate border-b border-gray-100 dark:border-gray-800">
                              {data.user.name}
                            </div>
                          )}
                          {[
                            { href: `/user/${data?.user?.email}`, label: "My profile" },
                            { href: "/favorites", label: "Favorites" },
                            { href: "/shared", label: "Shared with me" },
                            { href: "/settings", label: "Settings" },
                          ].map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              {item.label}
                            </Link>
                          ))}
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              signOut();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden lg:inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in
              </Link>
            )}

            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {authed && (
              <Link
                href="/new"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 mb-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Prompt
              </Link>
            )}
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/feedback"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-base font-medium text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8a9 9 0 110-18 9 9 0 010 18zm0 0l-4-1-1 1 1-4" />
              </svg>
              Feedback
            </Link>
            <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
            {authed ? (
              <>
                <Link href="/favorites" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Favorites</Link>
                <Link href="/shared" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Shared with me</Link>
                <Link href={`/user/${data?.user?.email}`} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">My profile</Link>
                <Link href="/settings" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Settings</Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="text-left px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// Made with Bob
