"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { PROMPT_CATEGORIES, AI_MODELS } from "@/lib/constants";

type TestedModel = { modelId: string; version?: string; notes?: string };

export default function NewPromptPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    body: "",
    image: "",
    isPrivate: false,
  });
  const [testedModels, setTestedModels] = useState<TestedModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [modelVersions, setModelVersions] = useState<Record<string, string>>({});
  const [modelNotes, setModelNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") return null;

  function toggleModel(modelId: string) {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
      const newVersions = { ...modelVersions };
      const newNotes = { ...modelNotes };
      delete newVersions[modelId];
      delete newNotes[modelId];
      setModelVersions(newVersions);
      setModelNotes(newNotes);
    } else {
      newSelected.add(modelId);
    }
    setSelectedModels(newSelected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Build tested models array
    const models: TestedModel[] = Array.from(selectedModels).map((modelId) => ({
      modelId,
      version: modelVersions[modelId] || undefined,
      notes: modelNotes[modelId] || undefined,
    }));

    const data = {
      ...form,
      image: form.image || undefined,
      testedModels: models.length > 0 ? models : undefined,
    };

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create prompt");
        setSaving(false);
        return;
      }

      const created = await res.json();
      router.push(`/prompt/${created.id}`);
    } catch (err) {
      setError("Failed to create prompt");
      setSaving(false);
    }
  }

  const input = "w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
  const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create New Prompt</h1>
          <p className="text-gray-600 dark:text-gray-400">Share your prompt with the community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>

            <div>
              <label className={label}>Prompt Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={input}
                placeholder="e.g., Code Review Assistant"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className={label}>Short Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={input}
                placeholder="Brief description of what this prompt does"
                required
                maxLength={300}
              />
            </div>

            <div>
              <label className={label}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={input}
                required
              >
                <option value="">Select a category</option>
                {PROMPT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Cover Image URL (optional)</label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className={input}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={form.isPrivate}
                onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPrivate" className="text-sm text-gray-700 dark:text-gray-300">
                Make this prompt private (only you can see it)
              </label>
            </div>
          </div>

          {/* Prompt Body */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prompt Content</h2>
            <div>
              <label className={label}>Prompt Text *</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className={`${input} font-mono text-sm`}
                rows={12}
                placeholder="Enter your prompt here... Use placeholders like <TOPIC>, <TEXT>, etc."
                required
                maxLength={5000}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {form.body.length}/5000 characters
              </p>
            </div>
          </div>

          {/* Tested Models */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tested AI Models</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the AI models you've tested this prompt with (optional)
            </p>

            <div className="space-y-3">
              {AI_MODELS.map((model) => (
                <div key={model.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`model-${model.id}`}
                      checked={selectedModels.has(model.id)}
                      onChange={() => toggleModel(model.id)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor={`model-${model.id}`} className="block">
                        <div className="font-medium text-gray-900 dark:text-white">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</div>
                      </label>

                      {selectedModels.has(model.id) && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            value={modelVersions[model.id] || ""}
                            onChange={(e) => setModelVersions({ ...modelVersions, [model.id]: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Version (e.g., gpt-4-0125-preview)"
                          />
                          <input
                            type="text"
                            value={modelNotes[model.id] || ""}
                            onChange={(e) => setModelNotes({ ...modelNotes, [model.id]: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Notes (e.g., Works best with temperature 0.7)"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? "Creating..." : "Create Prompt"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// Made with Bob
