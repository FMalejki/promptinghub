"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import { Avatar } from "../../Avatar";
import { getModelName, getModelProvider } from "@/lib/constants";

type TestedModel = { modelId: string; version?: string; notes?: string };
type Author = { email: string; name: string; image: string | null };

type PromptDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  ownerEmail: string;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  testedModels: TestedModel[];
  starredBy: string[];
  sharedWith: string[];
  createdAt: string;
};

export default function PromptDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPrompt();
  }, [params.id]);

  async function loadPrompt() {
    try {
      const res = await fetch(`/api/prompts/${params.id}`);
      if (!res.ok) {
        router.push("/browse");
        return;
      }
      const data = await res.json();
      setPrompt(data.prompt);
      setAuthor(data.author);
      setIsStarred(data.prompt.starredBy?.includes(session?.user?.email) || false);
    } catch (error) {
      router.push("/browse");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStar() {
    if (!session?.user?.email) {
      router.push("/login");
      return;
    }
    const res = await fetch(`/api/prompts/${params.id}/star`, { method: "POST" });
    if (res.ok) {
      setIsStarred(!isStarred);
      if (prompt) {
        setPrompt({
          ...prompt,
          stars: isStarred ? prompt.stars - 1 : prompt.stars + 1,
        });
      }
    }
  }

  function copyToClipboard() {
    if (prompt) {
      navigator.clipboard.writeText(prompt.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!prompt || !author) return null;

  const canEdit = session?.user?.email === prompt.ownerEmail;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/browse" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to browse
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-block px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  {prompt.category}
                </span>
                {prompt.isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Private
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {prompt.name}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                {prompt.description}
              </p>

              {/* Author */}
              <Link
                href={`/user/${author.email}`}
                className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar name={author.name} image={author.image} size={32} />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{author.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(prompt.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleStar}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isStarred
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <svg className="w-5 h-5" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>{prompt.stars}</span>
              </button>

              {canEdit && (
                <Link
                  href={`/prompt/${prompt.id}/edit`}
                  className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tested Models */}
        {prompt.testedModels.length > 0 && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tested on {prompt.testedModels.length} {prompt.testedModels.length === 1 ? "model" : "models"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prompt.testedModels.map((model, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {getModelName(model.modelId)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getModelProvider(model.modelId)}
                      </div>
                      {model.version && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Version: {model.version}
                        </div>
                      )}
                    </div>
                  </div>
                  {model.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                      {model.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompt Body */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Prompt</h2>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {prompt.body}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}

// Made with Bob
