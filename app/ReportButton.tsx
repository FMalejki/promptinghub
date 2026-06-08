"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

export function ReportButton({ promptId }: { promptId: string }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  if (status !== "authenticated") return null;

  async function submit() {
    if (!reason.trim()) return;
    setState("saving");
    const res = await fetch(`/api/prompts/${promptId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setState("done");
      setTimeout(() => {
        setOpen(false);
        setReason("");
        setState("idle");
      }, 1500);
    } else {
      setState("idle");
    }
  }

  if (state === "done") {
    return <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">Thanks — our moderators will take a look.</p>;
  }

  return (
    <div className="mt-8">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          ⚑ Report this prompt
        </button>
      ) : (
        <div className="max-w-md space-y-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400">Why are you reporting this prompt?</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Spam, inappropriate content, copyright…"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={state === "saving" || !reason.trim()}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg"
            >
              {state === "saving" ? "Sending…" : "Submit report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
