"use client";
import Link from "next/link";
import { Avatar } from "../Avatar";
import { getPlaceholderImage, getModelName } from "@/lib/constants";
import { isImagePrompt } from "@/lib/imageModels";
import { formatPrice, isPaid } from "@/lib/pricing";
import { lengthLabel } from "@/lib/promptLength";

type Author = { email: string; name: string; image: string | null };
type TestedModel = { modelId: string; version?: string; notes?: string };

type PromptCardProps = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  testedModels?: TestedModel[];
  copyCount?: number;
  priceCents?: number;
  tokens?: number;
};

export function PromptCard({ id, name, description, category, author, image, stars, isPrivate, testedModels = [], copyCount = 0, priceCents = 0, tokens }: PromptCardProps) {
  const displayImage = image || getPlaceholderImage(id);
  const imageGen = isImagePrompt({ testedModels, category });
  const length = lengthLabel(tokens);

  return (
    <Link
      href={`/prompt/${id}`}
      className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <img
          src={displayImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        {isPrivate && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900/80 backdrop-blur-sm rounded-md flex items-center gap-1">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs text-white font-medium">Private</span>
          </div>
        )}
        {isPaid(priceCents) && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-green-600/90 backdrop-blur-sm rounded-md">
            <span className="text-xs text-white font-semibold">{formatPrice(priceCents)}</span>
          </div>
        )}
        {imageGen && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-purple-600/90 backdrop-blur-sm rounded-md flex items-center gap-1">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-white font-medium">Image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category + length badges */}
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            {category}
          </span>
          {length && (
            <span
              title={`~${length.tokens} tokens`}
              className="inline-block px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-md"
            >
              {length.label}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
          {name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {description}
        </p>

        {/* Tested Models */}
        {testedModels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {testedModels.slice(0, 3).map((model, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                title={model.version ? `${getModelName(model.modelId)} ${model.version}` : getModelName(model.modelId)}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {getModelName(model.modelId)}
              </span>
            ))}
            {testedModels.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                +{testedModels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          {/* Author */}
          <Link
            href={`/user/${author.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar name={author.name} image={author.image} size={24} />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{author.name}</span>
          </Link>

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
      </div>
    </Link>
  );
}

// Made with Bob
