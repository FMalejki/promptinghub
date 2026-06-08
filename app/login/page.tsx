"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/browse" });
    if (res?.error) setErr("Invalid email or password");
    else if (res?.url) window.location.href = res.url;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-8">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-1">PromptingHub</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in to continue.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
            required
          />
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <button className="w-full bg-gray-800 hover:bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm rounded py-2">Sign in</button>
        </form>
        <div className="my-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex-1 border-t border-gray-200 dark:border-gray-700" /> or <span className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/browse" })}
          className="w-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded py-2"
        >
          Continue with Google
        </button>
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          No account?{" "}
          <Link href="/register" className="text-gray-800 dark:text-gray-200 underline">Register</Link>
        </p>
      </div>
    </main>
  );
}
