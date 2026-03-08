"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RichTextEditor } from "./RichTextEditor";

const SECTIONS = [
  { id: "Seva in Action", label: "Seva in Action" },
  { id: "Seva Ideas And Resources", label: "Seva Ideas And Resources" },
  { id: "SSSE & Sai Youth Corner", label: "SSSE & Sai Youth Corner" },
  { id: "Sai Inspires", label: "Sai Inspires" },
] as const;

type ActivityStub = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  imageUrl: string | null;
  startDate: string | null;
  volunteerCount: number;
  createdAt: string;
};

type BlogData = {
  featured: (ActivityStub & { durationHours: number | null }) | null;
  activities: ActivityStub[];
  impact: {
    hours: number;
    volunteers: number;
    familiesServed: number;
    centers: number;
  };
  popularTags: { name: string; count: number }[];
};

type CommunityPost = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  section: string;
  authorName: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  emojiCounts: Record<string, number>;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop";

function formatStat(n: number) {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

function excerpt(text: string, maxLen: number) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "…";
}

export default function SevaBlogPage() {
  const router = useRouter();
  const [data, setData] = useState<BlogData | null>(null);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [createModal, setCreateModal] = useState<{ open: boolean; section: string }>({
    open: false,
    section: SECTIONS[0].id,
  });

  const fetchCommunityPosts = useCallback(() => {
    return fetch("/api/blog-posts", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((posts) => {
        setCommunityPosts(Array.isArray(posts) ? posts : []);
        return posts;
      })
      .catch(() => {
        setCommunityPosts([]);
        return [];
      });
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setIsLoggedIn(!!data?.user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/seva-blog", { credentials: "include" }),
      fetch("/api/blog-posts", { credentials: "include" }),
    ])
      .then(([blogRes, postsRes]) => {
        if (!blogRes.ok) throw new Error("Failed to load blog data");
        return Promise.all([
          blogRes.json(),
          postsRes.ok ? postsRes.json() : Promise.resolve([]),
        ]);
      })
      .then(([blogData, posts]) => {
        setData(blogData);
        setCommunityPosts(posts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#fdf2f0]">
        <p className="text-[#6b5344]">Loading Seva stories…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#fdf2f0]">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const impact = data?.impact ?? {
    hours: 0,
    volunteers: 0,
    familiesServed: 0,
    centers: 0,
  };
  const featured = data?.featured ?? null;
  const activities = data?.activities ?? [];

  return (
    <div className="min-h-screen bg-[#fefaf8]">
      {/* Hero: title, tagline, heart-framed image + taglines (reference: Sai Heart Beats style) */}
      <section
        className="relative overflow-hidden px-4 py-4 sm:py-5 md:py-6"
        style={{
          background:
            "linear-gradient(145deg, #fdf2f0 0%, #f8e8e6 40%, #f0e0f5 70%, #f8e4e1 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          {/* Title + tagline */}
          <div className="mb-0 text-center">
            <h1
              className="font-serif text-2xl font-bold uppercase tracking-[0.18em] sm:text-3xl sm:tracking-[0.22em] md:text-4xl md:tracking-[0.26em]"
              style={{
                color: "#5a4538",
                textShadow:
                  "0 2px 4px rgba(90, 69, 56, 0.12), 0 1px 0 rgba(255,255,255,0.35) inset",
              }}
            >
              SAI <span className="text-red-500 drop-shadow-sm" aria-hidden>❤</span> HEART BEATS
            </h1>
            <p className="mt-1.5 text-sm font-medium text-[#8b6b5c] sm:text-base md:text-lg">
              LOVE IN ACTION
            </p>
          </div>
          <div className="-mt-1 flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-center lg:gap-8">
            {/* Left: heart-framed portrait (soft pink outline, symmetrical) */}
            <div
              className="flex shrink-0 justify-center lg:flex-1 lg:justify-end"
              style={{ minHeight: "160px" }}
            >
              <div
                className="h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] md:h-[220px] md:w-[220px] lg:h-[240px] lg:w-[240px]"
                style={{
                  filter: "drop-shadow(0 8px 24px rgba(244, 182, 182, 0.35))",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Sai_In_Heart.png"
                  alt=""
                  className="h-full w-full object-contain object-center"
                />
              </div>
            </div>
            {/* Right: quotes (balanced with image) */}
            <div className="flex flex-1 flex-col justify-center text-center lg:max-w-xl lg:text-left">
              <p className="text-base font-medium italic text-[#6b5344] sm:text-lg md:text-xl md:whitespace-nowrap">
                Stories of Love in Action · Seva that Transforms · Hearts that Unite
              </p>
              <p className="mt-2 font-serif text-xl font-semibold text-[#8b6b5c] sm:text-2xl md:text-3xl">
                Where Service Becomes Sadhana
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog analytics */}
      <section
        className="mx-auto max-w-6xl px-4 py-6"
        aria-label="Blog at a glance"
      >
        <div
          className="grid grid-cols-2 gap-3 rounded-2xl px-4 py-5 sm:grid-cols-4 sm:gap-4 sm:px-6 sm:py-6"
          style={{
            background:
              "linear-gradient(145deg, rgba(253, 242, 240, 0.9) 0%, rgba(248, 228, 225, 0.95) 50%, rgba(232, 180, 160, 0.12) 100%)",
            boxShadow: "0 1px 3px rgba(107, 83, 68, 0.08)",
          }}
        >
          {(() => {
            const totalPosts = communityPosts.length;
            const totalReactions = communityPosts.reduce(
              (sum, p) =>
                sum +
                (p.emojiCounts && typeof p.emojiCounts === "object"
                  ? Object.values(p.emojiCounts).reduce((a, b) => a + b, 0)
                  : 0),
              0
            );
            const contributors = new Set(
              communityPosts
                .map((p) => p.authorName?.trim())
                .filter(Boolean)
            ).size;
            const sectionsActive = new Set(
              communityPosts.map((p) => p.section).filter(Boolean)
            ).size;
            const stats = [
              {
                label: "Stories shared",
                value: formatStat(totalPosts),
                icon: "✍️",
                desc: "Community posts",
              },
              {
                label: "Reactions",
                value: formatStat(totalReactions),
                icon: "❤️",
                desc: "Hearts & engagement",
              },
              {
                label: "Contributors",
                value: formatStat(contributors),
                icon: "👥",
                desc: "Authors & voices",
              },
              {
                label: "Sections",
                value: formatStat(sectionsActive),
                icon: "📂",
                desc: "Categories active",
              },
            ];
            return stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center rounded-2xl border border-[#e8b4a0]/40 bg-white/90 px-4 py-5 shadow-sm transition hover:shadow-md hover:border-[#e8b4a0]/60"
              >
                <span className="text-2xl opacity-90 sm:text-3xl" aria-hidden>
                  {stat.icon}
                </span>
                <p className="mt-2 font-serif text-2xl font-bold text-[#6b5344] sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-[#8b6b5c]">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-[#7a6b65]">{stat.desc}</p>
              </div>
            ));
          })()}
        </div>
      </section>

      {/* Four info cards + Create A Post per section */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              section: SECTIONS[0].id,
              href: "/seva-blog#stories",
              bg: "bg-[#e8b4a0]",
              text: "text-[#4a3f3a]",
              title: "Seva in Action",
              subtitle: "Examples: Inspiring Selfless Seva Offerings from our Centers",
              items: ["Narayana Seva/ Food Service", "Educare", "Medicare", "Sociocare"],
            },
            {
              section: SECTIONS[1].id,
              href: "/seva-blog#stories",
              bg: "bg-[#a8c5b0]",
              text: "text-[#2d3d2d]",
              title: "Seva Ideas And Resources",
              subtitle: "Guides, Templates & Toolkits to Inspire Seva",
              items: ["150+ Service Ideas", "Checklists & Templates", "Documents & Guides"],
            },
            {
              section: SECTIONS[2].id,
              href: "/find-seva",
              bg: "bg-[#a8b5c4]",
              text: "text-[#2d323d]",
              title: "SSSE & Sai Youth Corner",
              subtitle: "Young Hearts Serving",
              items: ["Kids Teach Kids", "Artwork & Essays", "Value-Based Activities", "SSSE Seva Highlights"],
            },
            {
              section: SECTIONS[3].id,
              href: "/find-seva",
              bg: "bg-[#a8d0d0]",
              text: "text-[#2d3d3d]",
              title: "Sai Inspires",
              subtitle: "Message ▷ Reflection ▷ Application",
              items: ["Swami Quotes on Service", "Unity of Faith Stories", "Short devotionals", "Did You Know? Seva facts"],
            },
          ].map((card) => (
            <div key={card.section} className="flex h-full flex-col">
              <Link
                href={card.href}
                className={`flex min-h-0 flex-1 flex-col rounded-xl ${card.bg} p-5 ${card.text} shadow-md transition hover:shadow-lg`}
              >
                <h3 className="text-center font-serif text-lg font-bold uppercase tracking-wide">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm opacity-90">{card.subtitle}</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm">
                  {card.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (isLoggedIn) {
                    setCreateModal({ open: true, section: card.section });
                  } else {
                    setShowLoginRequiredModal(true);
                  }
                }}
                className="mt-2 flex-shrink-0 rounded-lg border-2 border-dashed border-[#8b6b5c] bg-white/80 py-2.5 text-sm font-semibold text-[#8b6b5c] transition hover:bg-[#fdf2f0]"
              >
                Create A Post
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Guideline For Posting */}
      <section
        className="mx-auto max-w-6xl px-4 py-8"
        aria-label="Guideline for posting"
      >
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#e8b4a0]/40 bg-white/95 px-6 py-8 shadow-sm sm:flex-row sm:gap-6"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(253, 242, 240, 0.5) 100%)",
          }}
        >
          <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
            <h3 className="font-serif text-xl font-semibold text-[#6b5344] sm:text-2xl">
              Guideline For Posting
            </h3>
            <p className="mt-2 text-sm text-[#7a6b65]">
              Please read our blog posting guidelines before creating a post.
            </p>
          </div>
          <a
            href="/Sai_Seva_Portal_Blog_Posting_and_Comment_Section_Guidelines.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-[#8b6b5c] bg-white px-6 py-3 text-sm font-semibold text-[#8b6b5c] shadow-sm transition hover:bg-[#fdf2f0] hover:border-[#6b5344] hover:text-[#6b5344]"
          >
            <span aria-hidden>📄</span>
            View guidelines (PDF)
          </a>
        </div>
      </section>

      {/* Posted stories – community posts */}
      <section
        id="stories"
        className="mx-auto max-w-6xl px-4 py-8"
        aria-label="Posted stories"
      >
        <h2 className="font-serif text-2xl font-bold text-[#5a4538] sm:text-3xl">
          Stories
        </h2>
        <p className="mt-1 text-sm text-[#7a6b65]">
          Community posts from our contributors
        </p>
        {communityPosts.length === 0 ? (
          <p className="mt-6 text-center text-[#7a6b65]">
            No stories yet. Be the first to create a post above.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {communityPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                onReaction={fetchCommunityPosts}
              />
            ))}
          </div>
        )}
      </section>

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-6xl px-4 py-2 text-sm text-[#7a6b65]">
        <Link href="/" className="hover:text-[#8b6b5c] hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/seva-blog" className="hover:text-[#8b6b5c] hover:underline">
          Seva Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#6b5344]">Stories</span>
      </nav>

      {/* Footer strip */}
      <footer className="border-t border-[#e8b4a0]/30 bg-white/80 py-6" />

      {showLoginRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#e8b4a0] bg-[#fdf2f0] px-6 py-6 shadow-xl">
            <p className="text-center text-[#6b5344]">
              Please log in to create a post.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login?next=/seva-blog"
                className="rounded-lg bg-[#8b6b5c] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#6b5344]"
              >
                Log in
              </Link>
              <button
                type="button"
                onClick={() => setShowLoginRequiredModal(false)}
                className="rounded-lg border border-[#8b6b5c] bg-white px-5 py-2.5 text-sm font-semibold text-[#8b6b5c] hover:bg-[#fdf2f0]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {createModal.open && (
        <CreatePostModal
          section={createModal.section}
          onClose={() => setCreateModal((m) => ({ ...m, open: false }))}
          onSuccess={(newPostId, pendingVerification) => {
            setCreateModal((m) => ({ ...m, open: false }));
            fetchCommunityPosts();
            if (newPostId && !pendingVerification) {
              router.push(`/seva-blog/post/${newPostId}`);
            }
          }}
        />
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  if (!html || !html.trimStart().startsWith("<")) return html;
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function CommunityPostCard({
  post,
  onReaction,
}: {
  post: CommunityPost;
  onReaction: () => void;
}) {
  const [reacting, setReacting] = useState(false);
  const [emojiCounts, setEmojiCounts] = useState(post.emojiCounts);

  async function setReaction(emojiCode: string) {
    if (reacting) return;
    setReacting(true);
    try {
      const res = await fetch(`/api/blog-posts/${post.id}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "EMOJI", emojiCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmojiCounts(data.emojiCounts || {});
        onReaction();
      }
    } finally {
      setReacting(false);
    }
  }

  const EMOJIS = ["👍", "❤️", "🙏"];
  const imageUrl = post.imageUrl || PLACEHOLDER_IMAGE;
  const plainContent = stripHtml(post.content);

  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-md transition hover:shadow-lg">
      <Link href={`/seva-blog/post/${post.id}`} className="block">
        <div className="relative flex min-h-[140px] items-center justify-center bg-[#f8e4e1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl.startsWith("http") ? imageUrl : imageUrl}
            alt={post.title}
            className="max-h-[200px] w-full object-contain"
          />
        </div>
        <div className="p-4">
          <span className="text-xs text-[#7a6b65]">{post.section}</span>
          <h4 className="mt-1 font-serif text-lg font-semibold text-[#6b5344] line-clamp-2">
            {post.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-sm text-[#7a6b65]">
            {excerpt(plainContent, 80)}
          </p>
          {post.authorName && (
            <p className="mt-1 text-xs text-[#7a6b65]">by {post.authorName}</p>
          )}
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#f8e4e1] px-4 py-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setReaction(emoji);
            }}
            disabled={reacting}
            className="rounded border border-[#e8b4a0] px-2 py-1 text-sm hover:bg-[#fdf2f0]"
          >
            {emoji} {(emojiCounts[emoji] || 0) > 0 && emojiCounts[emoji]}
          </button>
        ))}
      </div>
    </article>
  );
}

function CreatePostModal({
  section,
  onClose,
  onSuccess,
}: {
  section: string;
  onClose: () => void;
  onSuccess: (newPostId?: string, pendingVerification?: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPEG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setError(null);
    setImageFile(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog-posts/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function isContentEmpty(html: string): boolean {
    const t = html.trim().replace(/<[^>]*>/g, "").trim();
    return !t || t === "\n";
  }

  async function handlePublish() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (isContentEmpty(content)) {
      setError("Content is required.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/blog-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          imageUrl: imageUrl || undefined,
          section,
          authorName: authorName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Failed to publish");
        throw new Error(msg);
      }
      const pending = data.status === "PENDING_APPROVAL" || !!data.message?.toLowerCase().includes("verification");
      if (pending) {
        setSuccessMessage(data.message || "Your post has been sent for verification. It will be visible after an admin approves it.");
        setTimeout(() => {
          onSuccess(data.id, true);
        }, 2500);
      } else {
        onSuccess(data.id, false);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#e8b4a0] bg-white px-6 py-4">
          <h3 className="font-serif text-xl font-semibold text-[#6b5344]">
            Create A Post · {section}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#7a6b65] hover:bg-[#fdf2f0]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              Sai Ram! {successMessage}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-[#6b5344]">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
              placeholder="Post title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6b5344]">Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              className="mt-1 w-full text-sm text-[#7a6b65] file:mr-2 file:rounded file:border-0 file:bg-[#fdf2f0] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#8b6b5c]"
            />
            {uploading && <p className="mt-1 text-xs text-[#7a6b65]">Uploading…</p>}
            {imageUrl && (
              <div className="relative mt-2 flex min-h-[120px] w-full max-w-xs items-center justify-center overflow-hidden rounded-lg bg-[#f8e4e1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-40 w-full object-contain"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6b5344]">Full article *</label>
            <p className="mt-1 mb-2 text-xs text-[#7a6b65]">Use the toolbar for font, size, bold, italic, lists, link, and more.</p>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your full article here…"
              minHeight="220px"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6b5344]">Your name (optional)</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
              placeholder="Author name"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#e8b4a0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#8b6b5c] bg-white px-4 py-2 text-sm font-semibold text-[#8b6b5c] hover:bg-[#fdf2f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={submitting || isContentEmpty(content)}
            className="rounded-lg bg-[#8b6b5c] px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
