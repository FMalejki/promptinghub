"use client";
import { useState } from "react";
import { Navbar } from "../components/Navbar";

const CATEGORIES = [
  { value: "idea", label: "💡 Idea / feature request" },
  { value: "bug", label: "🐞 Something's broken" },
  { value: "confusing", label: "🤔 Confusing / hard to use" },
  { value: "praise", label: "❤️ Praise" },
  { value: "other", label: "Other" },
];

export default function FeedbackClient() {
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          category,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      setState(res.ok ? "sent" : "error");
      if (res.ok) setMessage("");
    } catch {
      setState("error");
    }
  }

  const input = "w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Send feedback</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          What's working, what's confusing, or what you'd love to see? We read every note.
        </p>

        {state === "sent" ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 text-center">
            <p className="text-green-800 dark:text-green-300 font-medium mb-3">Thanks — your feedback was sent. 🙌</p>
            <button onClick={() => setState("idle")} className="text-sm text-green-700 dark:text-green-400 hover:underline">
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div>
              <label htmlFor="fb-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select id="fb-cat" className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="fb-msg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your feedback</label>
              <textarea
                id="fb-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={2000}
                required
                placeholder="Tell us what's on your mind…"
                className={input}
              />
              <p className="mt-1 text-xs text-gray-400">{message.length}/2000</p>
            </div>
            {state === "error" && <p className="text-sm text-red-600 dark:text-red-400">Couldn't send — please try again.</p>}
            <button
              type="submit"
              disabled={state === "sending" || !message.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {state === "sending" ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
