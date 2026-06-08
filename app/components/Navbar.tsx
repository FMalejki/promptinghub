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
];

export function Navbar() {
  const { status, data } = useSession();
  const { theme, toggleTheme } = useTheme();
  const authed = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

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
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => setMobileOpen(false)}>
            <img src="/static/image.png" alt="PromptingHub Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-semibold text-gray-900 dark:text-white">PromptingHub</span>
          </Link>

          {/* Primary nav (desktop) */}
          <div className="hidden sm:flex items-center gap-1 ml-6">
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
                  className="hidden sm:flex shrink-0 items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Prompt
                </Link>

                {/* User menu (desktop) */}
                <div className="hidden sm:flex items-center gap-3">
                  <NotificationBell />
                  <Link href="/favorites" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Favorites">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </Link>

                  <Link href="/settings" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Settings">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>

                  <Link href={`/user/${data?.user?.email}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {data?.user?.image ? (
                      <img src={data.user.image} alt={data.user.name || "User"} className="w-8 h-8 rounded-full" />
                    ) : (
                      <Avatar name={data?.user?.name || ""} image={data?.user?.image} size={32} />
                    )}
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in
              </Link>
            )}

            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
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
            <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
            {authed ? (
              <>
                <Link href="/favorites" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Favorites</Link>
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
