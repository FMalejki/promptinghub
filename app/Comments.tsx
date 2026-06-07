"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

type Author = { email: string; name: string; image: string | null };
type Comment = { id: string; body: string; author: Author; createdAt: string };

export function Comments({ promptId }: { promptId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  function load() {
    fetch(`/api/prompts/${promptId}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d) => setComments(d.comments || []))
      .catch(() => {});
  }
  useEffect(load, [promptId]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.email) {
      router.push("/login");
      return;
    }
    if (!body.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/prompts/${promptId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    setPosting(false);
    if (res.ok) {
      setBody("");
      load();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Comments {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
      </h2>

      <form onSubmit={post} className="mb-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={session?.user?.email ? "Share how you used this prompt…" : "Sign in to comment"}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {posting ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet — be the first.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author.name} image={c.author.image} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{c.author.name}</span>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  {session?.user?.email === c.author.email && (
                    <button onClick={() => remove(c.id)} className="ml-auto text-xs text-gray-400 hover:text-red-600">
                      delete
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
