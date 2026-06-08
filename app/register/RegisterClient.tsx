"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

const inputClass =
  "w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        setErr(error || "Couldn't create your account. Please try again.");
        return;
      }
      const r = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/browse" });
      if (r?.error) {
        // Account was created but auto sign-in failed — send them to log in.
        setErr("Account created. Please sign in.");
        window.location.href = "/login";
        return;
      }
      // Don't dead-end if NextAuth omits the url.
      window.location.href = r?.url ?? "/browse";
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <Link href="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
        <img src="/static/image.png" alt="" className="w-9 h-9 object-contain" />
        <span className="text-xl font-semibold text-gray-900 dark:text-white">PromptingHub</span>
      </Link>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Free — email and a password (min 8 characters).</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="text" placeholder="Account name (optional)" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className={inputClass} required />
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          Have an account?{" "}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
