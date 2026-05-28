"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setErr(error);
      return;
    }
    const r = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/browse" });
    if (r?.url) window.location.href = r.url;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded p-8">
        <h1 className="text-xl font-medium text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Use email and a password (min 8 chars).</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Account name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            required
          />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button className="w-full bg-gray-800 hover:bg-gray-900 text-white text-sm rounded py-2">Register</button>
        </form>
        <p className="mt-6 text-xs text-gray-500 text-center">
          Have an account?{" "}
          <Link href="/login" className="text-gray-800 underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
