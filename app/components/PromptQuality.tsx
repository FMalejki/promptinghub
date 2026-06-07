"use client";
import { useMemo } from "react";
import { lintPrompt, type LintCheck } from "@/lib/promptLint";

// Live, advisory authoring feedback shown in the prompt editor. Runs the pure
// linter in the browser on every keystroke (no network) and renders a score
// plus the failing checks as easy-win hints. Passing checks collapse to a quiet
// summary so a strong prompt doesn't get a wall of green.
export function PromptQuality({ text }: { text: string }) {
  const result = useMemo(() => lintPrompt(text), [text]);
  const failing = result.checks.filter((c) => !c.pass);
  const passing = result.checks.length - failing.length;

  const tone =
    result.score >= 80
      ? "text-green-700 dark:text-green-400"
      : result.score >= 50
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  const bar =
    result.score >= 80 ? "bg-green-500" : result.score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prompt quality</h2>
        <span className={`text-sm font-semibold tabular-nums ${tone}`}>{result.score}/100</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Advisory tips to strengthen your prompt — none are required to publish.
      </p>

      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${result.score}%` }} />
      </div>

      {failing.length === 0 ? (
        <p className="text-sm text-green-700 dark:text-green-400">Looks great — every check passes.</p>
      ) : (
        <ul className="space-y-2">
          {failing.map((c: LintCheck) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <span
                className={c.severity === "warn" ? "text-red-500" : "text-gray-400"}
                aria-hidden
              >
                {c.severity === "warn" ? "!" : "•"}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">{c.label}.</span> {c.hint}
              </span>
            </li>
          ))}
        </ul>
      )}

      {failing.length > 0 && passing > 0 && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {passing} of {result.checks.length} checks already pass.
        </p>
      )}
    </div>
  );
}
