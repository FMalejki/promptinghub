"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { Avatar } from "../Avatar";
import { ImageUploadButton } from "../components/ImageUploadButton";

export default function SettingsPage() {
  const { status, data: session, update } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    image: "",
    bio: "",
    website: "",
    x: "",
    github: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState<string[]>([]);
  const [notifSaving, setNotifSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showAvatarUrl, setShowAvatarUrl] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    const email = session?.user?.email;
    if (!email || confirmText !== email) {
      setDeleteError("Type your email exactly to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: email }),
    });
    if (res.ok) {
      await signOut({ redirect: false });
      router.push("/");
    } else {
      setDeleting(false);
      setDeleteError("Could not delete your account. Please try again.");
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Seed name/image from the session, then hydrate bio/links from the profile API.
      setForm((f) => ({ ...f, name: session.user?.name || "", image: session.user?.image || "" }));
      fetch("/api/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (p) {
            setForm((f) => ({ ...f, bio: p.bio || "", website: p.website || "", x: p.x || "", github: p.github || "" }));
            setMuted(Array.isArray(p.mutedNotificationTypes) ? p.mutedNotificationTypes : []);
          }
        })
        .catch(() => {});
    }
  }, [status, session]);

  if (status !== "authenticated") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          image: form.image || null,
          bio: form.bio,
          website: form.website,
          x: form.x,
          github: form.github,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      await update({
        name: form.name,
        image: form.image || null,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotif(type: string, enabled: boolean) {
    // enabled = deliver this type; unchecked = mute it.
    const next = enabled ? muted.filter((t) => t !== type) : Array.from(new Set([...muted, type]));
    setMuted(next);
    setNotifSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutedNotificationTypes: next }),
      });
    } catch {
      /* revert on failure */
      setMuted(muted);
    } finally {
      setNotifSaving(false);
    }
  }

  const NOTIF_OPTIONS: { type: string; label: string }[] = [
    { type: "follow", label: "New followers" },
    { type: "comment", label: "Comments on your prompts" },
    { type: "reply", label: "Replies to your comments" },
    { type: "mention", label: "Mentions of you" },
    { type: "fork", label: "Forks of your prompts" },
    { type: "share", label: "Prompts shared with you" },
    { type: "collaborator", label: "Added as a collaborator" },
    { type: "collection", label: "Updates to collections you follow" },
  ];

  const input = "w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
  const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account settings and profile</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h2>

          {/* Preview */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <Avatar name={form.name} image={form.image} size={56} />
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">{form.name || "Your Name"}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{session?.user?.email}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={label}>Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={input}
                placeholder="Your display name"
                required
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This is how your name will appear to other users
              </p>
            </div>

            <div>
              <label className={label}>Profile Picture</label>
              {/* Upload from device is the primary action; the raw URL field is
                  tucked behind a toggle so it doesn't dominate (URL avatars still
                  work — existing/seed accounts use them). */}
              <ImageUploadButton kind="avatar" onUploaded={(url) => setForm((f) => ({ ...f, image: url }))} />
              {!showAvatarUrl ? (
                <button
                  type="button"
                  onClick={() => setShowAvatarUrl(true)}
                  className="mt-2 block text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  or paste an image URL
                </button>
              ) : (
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className={`${input} mt-2`}
                  placeholder="https://example.com/avatar.jpg"
                  autoFocus
                />
              )}
              {form.image && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image: "" }))}
                  className="mt-2 ml-3 inline text-xs text-gray-400 hover:text-red-600"
                >
                  remove
                </button>
              )}
            </div>

            <div>
              <label className={label}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className={input}
                rows={3}
                maxLength={280}
                placeholder="A sentence or two about you and the prompts you share."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={label}>Website</label>
                <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={input} placeholder="https://you.dev" />
              </div>
              <div>
                <label className={label}>X / Twitter</label>
                <input type="text" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} className={input} placeholder="handle" />
              </div>
              <div>
                <label className={label}>GitHub</label>
                <input type="text" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} className={input} placeholder="username" />
              </div>
            </div>

            <div>
              <label className={label}>Email</label>
              <input
                type="email"
                value={session?.user?.email || ""}
                className={`${input} bg-gray-100 dark:bg-gray-900 cursor-not-allowed`}
                disabled
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Email cannot be changed
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {saved && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully!</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Notifications */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notifications</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose which activity sends you a notification{notifSaving ? " — saving…" : ""}.
          </p>
          <div className="space-y-3">
            {NOTIF_OPTIONS.map((o) => {
              const enabled = !muted.includes(o.type);
              return (
                <label key={o.type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => toggleNotif(o.type, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Your data */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your data</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Download a JSON copy of your profile, prompts and collections.
          </p>
          <a
            href="/api/account/export"
            className="inline-block px-4 py-2 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            Export my data
          </a>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Once you delete your account, there is no going back. This permanently removes your
            prompts, collections and comments. Please be certain.
          </p>
          {!confirmOpen ? (
            <button
              type="button"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
              onClick={() => setConfirmOpen(true)}
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                Type <span className="font-mono font-semibold break-all">{session?.user?.email}</span> to confirm:
              </label>
              <input
                type="email"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder={session?.user?.email || "your email"}
              />
              {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmOpen(false);
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting || confirmText !== session?.user?.email}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  {deleting ? "Deleting…" : "Permanently delete my account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Made with Bob
