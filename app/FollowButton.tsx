"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function FollowButton({ handle }: { handle: string }) {
  const { status, data: session } = useSession();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/follow?handle=${encodeURIComponent(handle)}`)
      .then((r) => (r.ok ? r.json() : { following: false, followers: 0 }))
      .then((d) => {
        setFollowing(!!d.following);
        setFollowers(d.followers || 0);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [handle]);

  async function toggle() {
    if (status !== "authenticated") {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    const next = !following;
    setFollowing(next);
    setFollowers((n) => Math.max(0, n + (next ? 1 : -1)));
    await fetch("/api/follow", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle }),
    }).catch(() => {});
    setBusy(false);
  }

  // Hide on your own profile.
  const ownHandleLikely = session?.user?.email && session.user.email.split("@")[0] === handle;
  if (ownHandleLikely) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">{followers} follower{followers === 1 ? "" : "s"}</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy || !loaded}
        aria-pressed={following}
        aria-label={following ? "Unfollow this creator" : "Follow this creator"}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
          following
            ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">{followers} follower{followers === 1 ? "" : "s"}</span>
    </div>
  );
}
