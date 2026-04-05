"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BlogDriveMediaSection } from "@/app/seva-blog/BlogDriveMediaSection";
import { BlogPostFormModal } from "@/app/seva-blog/BlogPostFormModal";
import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop";

const EMOJI_OPTIONS = ["👍", "❤️", "🙏", "🌟", "💪"];

type Post = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  driveFolderUrl?: string | null;
  driveMediaLinks?: unknown;
  section: string;
  authorName: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  emojiCounts: Record<string, number>;
  myReaction: { type: string; emojiCode?: string } | null;
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  const [canEditBlog, setCanEditBlog] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const loadPost = useCallback(() => {
    if (!id) return;
    fetch(`/api/blog-posts/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Post not found");
        return res.json();
      })
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadPost();
  }, [id, loadPost]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const roles: string[] = Array.isArray(data?.user?.roles) ? data.user.roles : [];
        setCanEditBlog(roles.includes("ADMIN") || roles.includes("BLOG_ADMIN"));
      })
      .catch(() => setCanEditBlog(false));
  }, []);

  async function setReaction(type: string, emojiCode?: string) {
    if (!id || reacting) return;
    setReacting(true);
    try {
      const res = await fetch(`/api/blog-posts/${id}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, emojiCode }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likeCount: data.likeCount,
              dislikeCount: data.dislikeCount,
              emojiCounts: data.emojiCounts || {},
              myReaction: data.myReaction,
            }
          : null
      );
    } finally {
      setReacting(false);
    }
  }

  if (loading || !id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[#6b5344]">Loading…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-[#7a6b65]">Post not found.</p>
        <Link href="/seva-blog" className="mt-4 inline-block text-[#8b6b5c] hover:underline">
          ← Back to Seva Blog
        </Link>
      </div>
    );
  }

  const imageUrl = post.imageUrl || PLACEHOLDER_IMAGE;
  const driveMediaItems = normalizeStoredDriveMedia(post.driveMediaLinks);

  return (
    <div className="min-h-screen bg-[#fefaf8]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#7a6b65]">
          <div>
            <Link href="/seva-blog" className="hover:text-[#8b6b5c] hover:underline">
              Seva Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#6b5344]">{post.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEditBlog && id ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="shrink-0 rounded-lg border border-[#8b6b5c] bg-white px-4 py-2 text-sm font-semibold text-[#6b5344] shadow-sm hover:bg-[#fdf2f0]"
              >
                Edit post
              </button>
            ) : null}
            <Link
              href="/admin/blog-reports"
              className="shrink-0 rounded-lg border border-[#e8b4a0] bg-white px-4 py-2 text-sm font-semibold text-[#6b5344] shadow-sm hover:bg-[#fdf2f0]"
            >
              Generate report
            </Link>
          </div>
        </nav>

        <article className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="relative flex min-h-[200px] w-full items-center justify-center bg-[#f8e4e1] md:min-h-[300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl.startsWith("http") ? imageUrl : imageUrl}
              alt={post.title}
              className="max-h-[70vh] w-full max-w-full object-contain"
            />
          </div>
          <div className="p-6 md:p-8">
            <div className="text-sm text-[#7a6b65]">
              {post.section}
              {post.authorName && ` · ${post.authorName}`}
              {" · "}
              {formatDate(post.createdAt)}
            </div>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-[#6b5344] md:text-4xl">
              {post.title}
            </h1>

            {/* Emojis only */}
            <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-[#f8e4e1] py-4">
              <span className="text-sm text-[#7a6b65]">Reactions:</span>
              <div className="flex items-center gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setReaction("EMOJI", emoji)}
                    disabled={reacting}
                    className={`rounded-lg border px-2 py-1.5 text-lg transition ${
                      post.myReaction?.type === "EMOJI" &&
                      post.myReaction?.emojiCode === emoji
                        ? "border-[#8b6b5c] bg-[#fdf2f0]"
                        : "border-[#e8b4a0] bg-white hover:bg-[#fdf2f0]"
                    }`}
                    title={emoji}
                  >
                    {emoji}
                    {(post.emojiCounts[emoji] || 0) > 0 && (
                      <span className="ml-1 text-xs text-[#7a6b65]">
                        {post.emojiCounts[emoji]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="prose prose-lg mt-6 max-w-none text-[#4a3f3a] [&_img]:max-w-full [&_div]:mb-2 [&_br]:block"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />

            {post.driveFolderUrl && post.driveFolderUrl.startsWith("https://") ? (
              <section className="mt-8 rounded-xl border border-[#e8b4a0] bg-[#f8faf8] p-5">
                <h2 className="font-serif text-lg font-semibold text-[#6b5344]">
                  Media folder for this post
                </h2>
                <p className="mt-1 text-sm text-[#7a6b65]">
                  Photos, videos, and audio for this story are collected in this Google Drive folder.
                </p>
                <a
                  href={post.driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block break-all text-sm font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]"
                >
                  {post.driveFolderUrl}
                </a>
              </section>
            ) : null}

            <BlogDriveMediaSection items={driveMediaItems} />

            <CommentsSection postId={id} />

            <div className="mt-8 flex gap-4">
              <Link
                href="/seva-blog#stories"
                className="inline-flex items-center rounded-lg border-2 border-[#8b6b5c] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#8b6b5c] hover:bg-[#fdf2f0]"
              >
                ← Back to Stories
              </Link>
            </div>
          </div>
        </article>
      </div>

      {canEditBlog && id && editOpen ? (
        <BlogPostFormModal
          mode="edit"
          postId={id}
          onClose={() => setEditOpen(false)}
          onSuccess={(opts) => {
            if (opts?.saved) {
              setEditOpen(false);
              setLoading(true);
              loadPost();
            }
          }}
        />
      ) : null}
    </div>
  );
}

const COMMENT_MAX_LENGTH = 500;

function CommentsSection({ postId }: { postId: string }) {
  const [user, setUser] = useState<{ id: string; name?: string | null } | null | undefined>(undefined);
  const [comments, setComments] = useState<{ id: string; content: string; authorName: string | null; createdAt: string }[]>([]);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const loadComments = useCallback(() => {
    setLoading(true);
    fetch(`/api/blog-posts/${postId}/comments`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    if (text.length > COMMENT_MAX_LENGTH) {
      setError(`Comment must be at most ${COMMENT_MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/blog-posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text, authorName: authorName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please log in to comment.");
          return;
        }
        throw new Error(data.error || "Failed to post comment");
      }
      setContent("");
      loadComments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const isLoggedIn = user !== undefined && user !== null;

  return (
    <section className="mt-8 border-t border-[#f8e4e1] pt-8">
      <h2 className="font-serif text-xl font-semibold text-[#6b5344]">Comments</h2>

      {!isLoggedIn && user !== undefined && (
        <div className="mt-4 rounded-lg border border-[#e8b4a0] bg-[#fdf2f0] px-4 py-3 text-sm text-[#6b5344]">
          Please log in to comment.
          <Link href="/login" className="ml-2 font-semibold text-[#8b6b5c] hover:underline">
            Log in
          </Link>
        </div>
      )}

      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="mt-4">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.length <= COMMENT_MAX_LENGTH) setError(null);
            }}
            maxLength={COMMENT_MAX_LENGTH + 1}
            placeholder="Write a comment…"
            rows={3}
            className="w-full rounded-lg border border-[#e8b4a0] px-4 py-3 text-[#4a3f3a] outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
          />
          <div className="mt-1 flex items-center justify-between text-sm text-[#7a6b65]">
            <span>{content.length} / {COMMENT_MAX_LENGTH} characters</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-48 rounded border border-[#e8b4a0] px-2 py-1 text-sm"
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="mt-3 rounded-lg bg-[#8b6b5c] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post comment"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[#7a6b65]">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-[#7a6b65]">No comments yet.{isLoggedIn ? " Be the first to comment." : ""}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-[#f8e4e1] bg-[#fefaf8] p-4">
              <div className="flex items-center gap-2 text-sm text-[#7a6b65]">
                {c.authorName && <span className="font-medium text-[#6b5344]">{c.authorName}</span>}
                <span>{formatDate(c.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[#4a3f3a]">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
