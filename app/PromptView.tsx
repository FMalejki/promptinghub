"use client";
import { useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { applyVariables, extractVariablesFromFiles } from "@/lib/template";

export type PromptFile = { path: string; content: string; language: string };
export type PromptViewData = {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  files: PromptFile[];
  author: { email: string; name: string; image: string | null };
  handle?: string;
  slug?: string;
};

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs bg-gray-800 hover:bg-gray-900 text-white rounded px-3 py-1 shrink-0"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

export function PromptView({ prompt }: { prompt: PromptViewData }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const vars = useMemo(() => extractVariablesFromFiles(prompt.files), [prompt.files]);
  const filled = useMemo(
    () => prompt.files.map((f) => ({ ...f, content: applyVariables(f.content, values) })),
    [prompt.files, values]
  );
  const multi = filled.length > 1;
  const allText = filled.map((f) => (multi ? `// ${f.path}\n${f.content}` : f.content)).join("\n\n");
  const ref = prompt.handle && prompt.slug ? `${prompt.handle}/${prompt.slug}` : null;

  return (
    <article>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{prompt.name}</h1>
        <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-1">{prompt.category}</span>
      </div>
      {ref && <div className="text-xs font-mono text-gray-400 mt-0.5">{ref}</div>}
      <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Avatar name={prompt.author.name} image={prompt.author.image} size={20} />
          <span>{prompt.author.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {multi && <span className="text-xs text-gray-400">{filled.length} files</span>}
          <CopyButton text={allText} label={multi ? "Copy all" : "Copy"} />
        </div>
      </div>

      {ref && (
        <div className="mt-4 flex items-center justify-between gap-2 border border-gray-200 rounded bg-gray-50 px-3 py-2">
          <code className="text-xs text-gray-700 truncate">npx promptinghub add {ref}</code>
          <CopyButton text={`npx promptinghub add ${ref}`} label="Copy install" />
        </div>
      )}

      {vars.length > 0 && (
        <div className="mt-6 border border-gray-200 rounded bg-gray-50 p-4">
          <div className="text-xs font-medium text-gray-700 mb-2">Customize ({vars.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vars.map((v) => (
              <label key={v.name} className="text-xs text-gray-600">
                <span className="font-mono text-gray-500">{v.name}</span>
                <input
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                  placeholder={v.default || v.name}
                  value={values[v.name] ?? ""}
                  onChange={(e) => setValues((cur) => ({ ...cur, [v.name]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {filled.map((f) => (
          <div key={f.path} className="border border-gray-200 rounded bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-gray-700 truncate">{f.path}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">{f.language}</span>
              </div>
              <CopyButton text={f.content} />
            </div>
            <pre className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap break-words font-mono overflow-x-auto">{f.content}</pre>
          </div>
        ))}
      </div>
    </article>
  );
}
