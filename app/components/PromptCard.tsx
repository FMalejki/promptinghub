"use client";
import { useState } from "react";
import Link from "next/link";
import { Avatar } from "../Avatar";
import { getPlaceholderImage, getModelName } from "@/lib/constants";
import { isImagePrompt } from "@/lib/imageModels";
import { formatPrice, isPaid } from "@/lib/pricing";
import { lengthLabel } from "@/lib/promptLength";
import type { CardAttestation } from "@/lib/attestations";
import { useWithBadge, type UseWith } from "@/lib/useWith";

type Author = { name: string; image: string | null; handle: string | null };
type TestedModel = { modelId: string; version?: string; notes?: string };

// Community-attestation card badge styling per dominant verdict.
const ATTEST_BADGE: Record<CardAttestation["verdict"], { label: string; cls: string; title: string }> = {
  works: {
    label: "✓ Works",
    cls: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
    title: "Community confirms this works",
  },
  mixed: {
    label: "~ Mixed",
    cls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    title: "Community reports mixed / partial results",
  },
  broken: {
    label: "✗ Issues",
    cls: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
    title: "Community reports this doesn't work well",
  },
};

type PromptCardProps = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  isSkill?: boolean;
  testedModels?: TestedModel[];
  copyCount?: number;
  priceCents?: number;
  tokens?: number;
  attestation?: CardAttestation | null;
  useWith?: UseWith;
};

export function PromptCard({ id, name, description, category, author, image, stars, isPrivate, isSkill = false, testedModels = [], copyCount = 0, priceCents = 0, tokens, attestation, useWith }: PromptCardProps) {
  const [imgSrc, setImgSrc] = useState(image || getPlaceholderImage(id, category));
  const imageGen = isImagePrompt({ testedModels, category });
  const length = lengthLabel(tokens);
  const attest = attestation ? ATTEST_BADGE[attestation.verdict] : null;
  const useWithChip = useWithBadge(useWith);

  return (
    <Link
      href={`/prompt/${id}`}
      className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
    >
      {/* Header: small cover thumbnail + title + inline meta (HF-style — the
          cover is secondary, not a hero). */}
      <div className="flex items-start gap-3">
        <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-700">
          <img
            src={imgSrc}
            alt=""
            loading="lazy"
            onError={() => setImgSrc(getPlaceholderImage(id, category))}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
            {name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-block px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded">
              {category}
            </span>
            {attest && attestation && (
              <span
                title={`${attest.title} — ${attestation.works}✓ / ${attestation.mixed}~ / ${attestation.broken}✗ across ${attestation.models} model${attestation.models === 1 ? "" : "s"}`}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded ${attest.cls}`}
              >
                {attest.label}
                <span className="tabular-nums font-normal opacity-70">{attestation.works + attestation.mixed + attestation.broken}</span>
              </span>
            )}
            {useWithChip && (
              <span
                title={`Best used with ${useWithChip.label === "Chat" ? "a web chat UI" : "coding agents"}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 rounded"
              >
                <span aria-hidden>{useWithChip.emoji}</span>
                {useWithChip.label}
              </span>
            )}
            {isSkill && (
              <span title="Marked as a reusable skill" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Skill
              </span>
            )}
            {length && (
              <span
                title={`~${length.tokens} tokens`}
                className="inline-block px-1.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded"
              >
                {length.label}
              </span>
            )}
            {imageGen && (
              <span className="inline-block px-1.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 rounded">
                Image
              </span>
            )}
            {isPrivate && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Private
              </span>
            )}
            {isPaid(priceCents) && (
              <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded">
                {formatPrice(priceCents)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
        {description}
      </p>

      {/* Tested Models */}
      {testedModels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {testedModels.slice(0, 3).map((model, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              title={model.version ? `${getModelName(model.modelId)} ${model.version}` : getModelName(model.modelId)}
            >
              {getModelName(model.modelId)}
            </span>
          ))}
          {testedModels.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
              +{testedModels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          {/* Author */}
          {author.handle ? (
            <Link
              href={`/u/${author.handle}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar name={author.name} image={author.image} size={24} />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{author.name}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar name={author.name} image={author.image} size={24} />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{author.name}</span>
            </div>
          )}

          {/* Stars + copies */}
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1" title={`${stars} stars`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium">{stars}</span>
            </div>
            {copyCount > 0 && (
              <div className="flex items-center gap-1" title={`${copyCount} copies / installs`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">{copyCount}</span>
              </div>
            )}
          </div>
        </div>
    </Link>
  );
}

// Made with Bob
