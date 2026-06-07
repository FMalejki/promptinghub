"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { renderMentions } from "@/lib/mentions";
import { sortRoots, type SortMode } from "@/lib/commentSort";

type Author = { email: string; name: string; image: string | null };
type Comment = {
  id: string;
  body: string;
  author: Author;
  parentId: string | null;
  createdAt: string;
  edited?: boolean;
  likeCount?: number;
  liked?: boolean;
};

// Linkify @handles in a comment body (mentions resolve to /u/<handle>).
function Body({ text }: { text: string }) {
  const parts = renderMentions(text);
  return (
    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-0.5">
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <a key={i} href={`/u/${p.handle}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            @{p.handle}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

export function Comments({ promptId }: { promptId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");

  function load() {
    fetch(`/api/prompts/${promptId}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d) => setComments(d.comments || []))
      .catch(() => {});
  }
  useEffect(load, [promptId]);

  async function send(text: string, parentId: string | null) {
    if (!session?.user?.email) {
      router.push("/login");
      return false;
    }
    if (!text.trim()) return false;
    const res = await fetch(`/api/prompts/${promptId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim(), ...(parentId ? { parentId } : {}) }),
    });
    if (res.ok) load();
    return res.ok;
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    const ok = await send(body, null);
    setPosting(false);
    if (ok) setBody("");
  }

  async function postReply(parentId: string) {
    const ok = await send(replyBody, parentId);
    if (ok) {
      setReplyBody("");
      setReplyTo(null);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((cs) => cs.filter((c) => c.id !== id && c.parentId !== id));
  }

  async function saveEdit(id: string) {
    if (!editBody.trim()) return;
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody.trim() }),
    });
    if (res.ok) {
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, body: editBody.trim(), edited: true } : c)));
      setEditing(null);
      setEditBody("");
    } else if (res.status === 409) {
      alert("The edit window for this comment has closed.");
    }
  }

  async function toggleLike(id: string) {
    if (!session?.user?.email) {
      router.push("/login");
      return;
    }
    const res = await fetch(`/api/comments/${id}/like`, { method: "POST" });
    if (res.ok) {
      const { liked, count } = await res.json();
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, liked, likeCount: count } : c)));
    }
  }

  // Group replies under their parent; the list arrives newest-first.
  const roots = sortRoots(comments.filter((c) => !c.parentId), sort);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (!c.parentId) continue;
    const arr = repliesByParent.get(c.parentId) || [];
    arr.push(c);
    repliesByParent.set(c.parentId, arr);
  }

  function CommentRow({ c, isReply }: { c: Comment; isReply?: boolean }) {
    // Show oldest-first within a thread so replies read top-to-bottom.
    const replies = (repliesByParent.get(c.id) || []).slice().reverse();
    return (
      <li className={isReply ? "flex gap-3 mt-4" : "flex gap-3"}>
        <Avatar name={c.author.name} image={c.author.image} size={isReply ? 28 : 36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{c.author.name}</span>
            <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
            {c.edited && <span className="text-xs text-gray-400 italic">(edited)</span>}
            {session?.user?.email === c.author.email && (
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(editing === c.id ? null : c.id);
                    setEditBody(c.body);
                  }}
                  className="text-xs text-gray-400 hover:text-blue-600"
                >
                  {editing === c.id ? "cancel" : "edit"}
                </button>
                <button onClick={() => remove(c.id)} className="text-xs text-gray-400 hover:text-red-600">
                  delete
                </button>
              </span>
            )}
          </div>
          {editing === c.id ? (
            <div className="mt-1">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => saveEdit(c.id)}
                  disabled={!editBody.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <Body text={c.body} />
          )}
          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={() => toggleLike(c.id)}
              title="Like this comment"
              className={`inline-flex items-center gap-1 text-xs ${
                c.liked ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={c.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-7a2 2 0 012-2h2.5" />
              </svg>
              {c.likeCount ? c.likeCount : ""}
              <span className="sr-only">like</span>
            </button>
            {!isReply && session?.user?.email && (
              <button
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {replyTo === c.id ? "Cancel" : "Reply"}
              </button>
            )}
          </div>
          {replyTo === c.id && (
            <div className="mt-2">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Write a reply… use @handle to mention"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => postReply(c.id)}
                  disabled={!replyBody.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
                >
                  Reply
                </button>
              </div>
            </div>
          )}
          {replies.length > 0 && (
            <ul className="mt-2 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
              {replies.map((r) => (
                <CommentRow key={r.id} c={r} isReply />
              ))}
            </ul>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
        </h2>
        {roots.length > 1 && (
          <div className="flex items-center gap-1 text-xs">
            {(["newest", "top"] as SortMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setSort(m)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize ${
                  sort === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={post} className="mb-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={session?.user?.email ? "Share how you used this prompt… use @handle to mention" : "Sign in to comment"}
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

      {roots.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet — be the first.</p>
      ) : (
        <ul className="space-y-4">
          {roots.map((c) => (
            <CommentRow key={c.id} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
