import Link from "next/link";

// Global footer — simple, theme-aware (class-based dark mode), not sticky.
// Only links to destinations that actually exist.
export function Footer() {
  const year = new Date().getFullYear();
  const col = "text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors";
  return (
    <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/static/image.png" alt="" className="w-6 h-6 object-contain" />
              <span className="font-semibold text-gray-900 dark:text-white">PromptingHub</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Discover, share, and version AI prompts.</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Explore</h3>
            <ul className="space-y-2">
              <li><Link href="/browse" className={col}>Browse</Link></li>
              <li><Link href="/templates" className={col}>Templates</Link></li>
              <li><Link href="/trending" className={col}>Trending</Link></li>
              <li><Link href="/collections" className={col}>Collections</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Discover</h3>
            <ul className="space-y-2">
              <li><Link href="/categories" className={col}>Categories</Link></li>
              <li><Link href="/tags" className={col}>Tags</Link></li>
              <li><Link href="/creators" className={col}>Creators</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="/feedback" className={col}>Send feedback</Link></li>
              <li><Link href="/security-policy" className={col}>Security</Link></li>
              <li>
                <a href="https://github.com/FMalejki/promptinghub" target="_blank" rel="noopener noreferrer" className={col}>
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-gray-400 dark:text-gray-500">© {year} PromptingHub</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Built by the community · prompts you can trust</p>
        </div>
      </div>
    </footer>
  );
}
