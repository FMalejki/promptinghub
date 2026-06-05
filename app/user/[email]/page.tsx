"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import { PromptCard } from "../../components/PromptCard";
import { Avatar } from "../../Avatar";

type Author = { email: string; name: string; image: string | null };
type TestedModel = { modelId: string; version?: string; notes?: string };
type Prompt = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  testedModels: TestedModel[];
};

type UserProfile = {
  email: string;
  name: string;
  image: string | null;
  promptCount: number;
  totalStars: number;
};

export default function UserProfilePage({ params }: { params: { email: string } }) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  const isOwnProfile = session?.user?.email === decodeURIComponent(params.email);

  useEffect(() => {
    loadProfile();
  }, [params.email]);

  async function loadProfile() {
    try {
      const email = decodeURIComponent(params.email);
      
      // Load user prompts
      const res = await fetch(`/api/prompts?owner=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to load");
      
      const data = await res.json();
      const userPrompts = data.prompts || [];
      
      setPrompts(userPrompts);
      
      // Calculate stats
      const totalStars = userPrompts.reduce((sum: number, p: Prompt) => sum + p.stars, 0);
      
      setProfile({
        email,
        name: userPrompts[0]?.author?.name || email.split("@")[0],
        image: userPrompts[0]?.author?.image || null,
        promptCount: userPrompts.length,
        totalStars,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User not found</h1>
          <Link href="/browse" className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to browse
          </Link>
        </div>
      </div>
    );
  }

  const filteredPrompts = prompts.filter((p) => {
    if (filter === "public") return !p.isPrivate;
    if (filter === "private") return p.isPrivate;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div className="flex items-start gap-6">
            <Avatar name={profile.name} image={profile.image} size={96} />
            
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {profile.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">{profile.email}</p>
                </div>
                
                {isOwnProfile && (
                  <Link
                    href="/settings"
                    className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.promptCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {profile.promptCount === 1 ? "Prompt" : "Prompts"}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.totalStars}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Stars
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {isOwnProfile && (
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              All ({prompts.length})
            </button>
            <button
              onClick={() => setFilter("public")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "public"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Public ({prompts.filter((p) => !p.isPrivate).length})
            </button>
            <button
              onClick={() => setFilter("private")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "private"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Private ({prompts.filter((p) => p.isPrivate).length})
            </button>
          </div>
        )}

        {/* Prompts Grid */}
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No prompts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isOwnProfile ? "Create your first prompt to get started" : "This user hasn't created any prompts yet"}
            </p>
            {isOwnProfile && (
              <Link
                href="/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Prompt
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} {...prompt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Made with Bob
