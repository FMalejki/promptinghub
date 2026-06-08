"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AI_MODELS, getModelName } from "@/lib/constants";

type Vote = "works" | "broken" | "mixed";
type ModelSummary = { modelId: string; works: number; broken: number; mixed: number; youVoted: Vote | null };

// Community attestations: confirm/deny a prompt works on a model, and add models
// the author didn't list. Optimistic-ish: re-fetches the authoritative summary
// from the server after each action.
export function ModelAttestations({ promptId }: { promptId: string }) {
  const { status } = useSession();
  const authed = status === "authenticated";
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/prompts/${promptId}/attest`)
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => active && setModels(d.models || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [promptId]);

  async function vote(modelId: string, v: Vote, currently: Vote | null) {
    if (!authed || busy) return;
    setBusy(modelId);
    const toggleOff = currently === v;
    try {
      const res = await fetch(`/api/prompts/${promptId}/attest`, {
        method: toggleOff ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toggleOff ? { modelId } : { modelId, vote: v }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.models) setModels(d.models);
    } finally {
      setBusy(null);
    }
  }

  const listed = useMemo(() => new Set(models.map((m) => m.modelId)), [models]);
  const addable = AI_MODELS.filter((m) => m.id !== "other" && !listed.has(m.id));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Community-tested models</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Confirm whether this prompt works on a model — or add one you’ve tested.
        {!authed && <span className="text-gray-400 dark:text-gray-500"> Sign in to vote.</span>}
      </p>

      {models.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No community votes yet — be the first.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {models.map((m) => (
            <li
              key={m.modelId}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{getModelName(m.modelId)}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => vote(m.modelId, "works", m.youVoted)}
                  disabled={!authed || busy === m.modelId}
                  title="Works on this model"
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 ${
                    m.youVoted === "works"
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                  }`}
                >
                  ✓ Works {m.works > 0 && <span className="tabular-nums">{m.works}</span>}
                </button>
                <button
                  onClick={() => vote(m.modelId, "mixed", m.youVoted)}
                  disabled={!authed || busy === m.modelId}
                  title="Works partially / inconsistently"
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 ${
                    m.youVoted === "mixed"
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  }`}
                >
                  ~ Mixed {m.mixed > 0 && <span className="tabular-nums">{m.mixed}</span>}
                </button>
                <button
                  onClick={() => vote(m.modelId, "broken", m.youVoted)}
                  disabled={!authed || busy === m.modelId}
                  title="Doesn't work on this model"
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 ${
                    m.youVoted === "broken"
                      ? "bg-red-600 border-red-600 text-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                  }`}
                >
                  ✗ No {m.broken > 0 && <span className="tabular-nums">{m.broken}</span>}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {authed && addable.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="">Add a model you’ve tested…</option>
            {addable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (adding) {
                vote(adding, "works", null);
                setAdding("");
              }
            }}
            disabled={!adding || busy !== null}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
          >
            It works
          </button>
        </div>
      )}
    </div>
  );
}
