import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";
import { CopyButton } from "../../PromptView";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

// oEmbed discovery: point consumers at the JSON endpoint for this prompt.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const oembed = `${SITE_URL}/api/oembed?url=${encodeURIComponent(`${SITE_URL}/prompt/${params.id}`)}`;
  return {
    title: "Embedded prompt — PromptingHub",
    other: { "oembed:json": oembed },
    alternates: { types: { "application/json+oembed": oembed } },
  };
}

// Minimal, chrome-free view designed to live inside an <iframe>.
export default async function EmbedPage({ params }: { params: { id: string } }) {
  let detail = null;
  try {
    detail = await getPromptDetail(await getDb(), params.id);
  } catch {
    detail = null;
  }

  if (!detail || detail.isPrivate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-6 text-sm text-gray-500 dark:text-gray-400">
        This prompt isn’t available to embed.
      </div>
    );
  }

  const files = detail.files ?? [];
  const multi = files.length > 1;
  const allText = files.map((f) => (multi ? `// ${f.path}\n${f.content}` : f.content)).join("\n\n");
  const promptUrl = `${SITE_URL}/prompt/${detail.id}`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <a href={promptUrl} target="_blank" rel="noopener noreferrer" className="block">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate hover:underline">{detail.name}</h1>
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {detail.category} · by {detail.author.name}
          </p>
        </div>
        <CopyButton text={allText} label="Copy" />
      </div>

      <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-mono bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-[260px] overflow-auto leading-relaxed">
        {allText}
      </pre>

      <div className="mt-3 text-right">
        <Link href={promptUrl} target="_blank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          View on PromptingHub ↗
        </Link>
      </div>
    </div>
  );
}
