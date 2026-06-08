"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "../Avatar";

export default function ProfilePage() {
  const { status, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile").then(async (r) => {
      if (!r.ok) return;
      const p = await r.json();
      setName(p?.name || "");
      setImage(p?.image || "");
      setEmail(p?.email || "");
    });
  }, [status]);

  if (status !== "authenticated") return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image }),
    });
    setSaving(false);
    if (res.ok) {
      await update({ name, image: image || null });
      setSaved(true);
    }
  }

  const input = "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 dark:focus:border-gray-400";
  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/browse" className="text-sm font-medium text-gray-800 dark:text-gray-100">PromptingHub</Link>
          <Link href="/browse" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Back to browse</Link>
        </div>
      </header>
      <section className="max-w-md mx-auto px-4 py-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Your profile</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{email}</p>
        <div className="flex items-center gap-3 mb-6">
          <Avatar name={name} image={image} size={56} />
          <span className="text-sm text-gray-500 dark:text-gray-400">Preview</span>
        </div>
        <form onSubmit={save} className="space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">Account name</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">Profile picture URL</span>
            <input className={input} value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
          </label>
          {saved && <p className="text-xs text-green-600 dark:text-green-400">Saved.</p>}
          <button disabled={saving} className="bg-gray-800 hover:bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded py-2 px-4">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </section>
    </main>
  );
}
