"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BlogPostFormModal } from "./BlogPostFormModal";

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
  centerCity?: string | null;
  sevaDate?: string | null;
  sevaCategory?: string | null;
  posterEmail?: string | null;
  posterPhone?: string | null;
};

/** Default image when a post has no image or when imageUrl is cleared in DB (e.g. to hide an inappropriate image). */
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop";

const POST_SUBMIT_SUCCESS_MESSAGE =
  "Sairam. Thank you for taking the time to submit the post. It will be reviewed and published shortly. Jai Sairam !!";

function formatStat(n: number) {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

function excerpt(text: string, maxLen: number) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "…";
}

export default function SevaBlogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() ?? "";
  const [searchDraft, setSearchDraft] = useState(qFromUrl);
  const [data, setData] = useState<BlogData | null>(null);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoadRef = useRef(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEditBlog, setCanEditBlog] = useState(false);
  const [canGenerateBlogReport, setCanGenerateBlogReport] = useState(false);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    postId: string;
  } | null>(null);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [createModal, setCreateModal] = useState<{ open: boolean; section: string }>({
    open: false,
    section: SECTIONS[0].id,
  });
  const [postSubmitSuccessMessage, setPostSubmitSuccessMessage] = useState<string | null>(null);
  const [postsFetchError, setPostsFetchError] = useState<string | null>(null);

  useEffect(() => {
    setSearchDraft(qFromUrl);
  }, [qFromUrl]);

  const fetchCommunityPosts = useCallback(() => {
    const q = searchParams.get("q")?.trim() ?? "";
    const params = new URLSearchParams();
    if (q) params.set("q", q.slice(0, 200));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return fetch(`/api/blog-posts${suffix}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((posts) => {
        if (posts == null) return posts;
        setCommunityPosts(Array.isArray(posts) ? posts : []);
        return posts;
      })
      .catch(() => {
        setCommunityPosts([]);
        return [];
      });
  }, [searchParams]);

  const postsListUrl = (() => {
    const q = qFromUrl.slice(0, 200);
    return q
      ? `/api/blog-posts?${new URLSearchParams({ q }).toString()}`
      : "/api/blog-posts";
  })();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const user = data?.user ?? null;
        setIsLoggedIn(!!user);
        const roles: string[] = (() => {
          if (Array.isArray(user?.roles) && user.roles.length > 0) {
            return user.roles.filter(
              (r: unknown): r is string => typeof r === "string"
            );
          }
          if (user?.role && typeof user.role === "string") return [user.role];
          return [];
        })();
        setIsAdmin(roles.includes("ADMIN"));
        setCanEditBlog(
          roles.includes("ADMIN") || roles.includes("BLOG_ADMIN")
        );
        setCanGenerateBlogReport(
          roles.includes("ADMIN") ||
            roles.includes("BLOG_ADMIN") ||
            roles.includes("SEVA_COORDINATOR")
        );
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setCanEditBlog(false);
        setCanGenerateBlogReport(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isFirstLoadRef.current) {
      setLoading(true);
    } else {
      setPostsLoading(true);
    }
    setError(null);
    setPostsFetchError(null);

    (async () => {
      try {
        const blogRes = await fetch("/api/seva-blog", { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        if (!blogRes.ok) {
          const body = (await blogRes.json().catch(() => ({}))) as { detail?: string };
          const msg =
            body?.detail && typeof body.detail === "string"
              ? `Failed to load blog data: ${body.detail}`
              : "Failed to load blog data";
          throw new Error(msg);
        }
        const blogData = (await blogRes.json()) as BlogData;
        if (cancelled) return;
        setData(blogData);

        const postsRes = await fetch(postsListUrl, { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        if (!postsRes.ok) {
          const body = (await postsRes.json().catch(() => ({}))) as { error?: string; detail?: string };
          const msg =
            (typeof body?.error === "string" && body.error) ||
            (typeof body?.detail === "string" && body.detail) ||
            `Could not load stories (HTTP ${postsRes.status})`;
          setPostsFetchError(msg);
          setCommunityPosts([]);
          return;
        }
        const posts = (await postsRes.json()) as unknown;
        if (cancelled) return;
        setCommunityPosts(Array.isArray(posts) ? posts : []);
        setPostsFetchError(null);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load blog data");
      } finally {
        if (cancelled) return;
        if (isFirstLoadRef.current) {
          setLoading(false);
          isFirstLoadRef.current = false;
        } else {
          setPostsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postsListUrl]);

  // Auto-hide success banner after 12 seconds (must be before any early return to keep hook order consistent)
  useEffect(() => {
    if (!postSubmitSuccessMessage) return;
    const t = setTimeout(() => setPostSubmitSuccessMessage(null), 12000);
    return () => clearTimeout(t);
  }, [postSubmitSuccessMessage]);

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

  const successBanner =
    typeof document !== "undefined" &&
    postSubmitSuccessMessage &&
    createPortal(
      <div
        className="fixed left-0 right-0 top-0 z-[99999] flex items-center gap-4 border-b-4 border-green-500 bg-green-300 px-4 py-4 shadow-xl sm:px-6"
        role="alert"
        data-success-banner="post-submitted"
      >
        <p className="flex-1 text-base font-bold text-green-900 sm:text-lg">
          {postSubmitSuccessMessage}
        </p>
        <button
          type="button"
          onClick={() => setPostSubmitSuccessMessage(null)}
          className="shrink-0 rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white hover:bg-green-600"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>,
      document.body
    );

  return (
    <div className={`min-h-screen bg-[#fefaf8] ${postSubmitSuccessMessage ? "pt-[80px]" : ""}`}>
      {successBanner}

      {/* Hero: title, tagline, heart-framed image + taglines (reference: Sai Heart Beats style) */}
      <section
        className="relative overflow-hidden px-4 pt-4 pb-2 sm:pt-5 sm:pb-3 md:pt-6 md:pb-4"
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
          <div className="-mt-1 flex flex-col items-center gap-3 landscape-desktop:flex-row landscape-desktop:items-center landscape-desktop:justify-center landscape-desktop:gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-6">
            {/* Left: heart-framed portrait (soft pink outline, symmetrical) */}
            <div
              className="flex shrink-0 justify-center landscape-desktop:flex-1 landscape-desktop:justify-end lg:flex-1 lg:justify-end"
              style={{ minHeight: "160px" }}
            >
              <div
                className="h-[160px] w-[160px] landscape-desktop:h-[200px] landscape-desktop:w-[200px] sm:h-[200px] sm:w-[200px] md:h-[220px] md:w-[220px] lg:h-[240px] lg:w-[240px]"
                style={{
                  filter: "drop-shadow(0 8px 24px rgba(244, 182, 182, 0.35))",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/PINK_SWAMI.png"
                  alt=""
                  className="h-full w-full object-contain object-center"
                />
              </div>
            </div>
            {/* Right: quotes (balanced with image) */}
            <div className="flex flex-1 flex-col justify-center text-center landscape-desktop:max-w-xl landscape-desktop:text-left lg:max-w-xl lg:text-left">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 landscape-desktop:grid-cols-4">
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
              href: "/seva-blog#stories",
              bg: "bg-[#a8b5c4]",
              text: "text-[#2d323d]",
              title: "SSSE & Sai Youth Corner",
              subtitle: "Young Hearts Serving",
              items: ["Kids Teach Kids", "Artwork & Essays", "Value-Based Activities", "SSSE Seva Highlights"],
            },
            {
              section: SECTIONS[3].id,
              href: "/seva-blog#stories",
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
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#e8b4a0]/40 bg-white/95 px-6 py-8 shadow-sm landscape-desktop:flex-row landscape-desktop:gap-6 sm:flex-row sm:gap-6"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(253, 242, 240, 0.5) 100%)",
          }}
        >
          <div className="flex flex-1 flex-col items-center text-center landscape-desktop:items-start landscape-desktop:text-left sm:items-start sm:text-left">
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#5a4538] sm:text-3xl">
              Stories
            </h2>
            <p className="mt-1 text-sm text-[#7a6b65]">
              Community posts from our contributors
            </p>
          </div>
          {canGenerateBlogReport ? (
            <Link
              id="generate-report"
              href="/admin/blog-reports"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e8b4a0] bg-white px-5 py-3 text-sm font-semibold text-[#6b5344] shadow-sm transition hover:bg-[#fdf2f0] sm:w-auto"
            >
              <span aria-hidden>📊</span>
              Generate report
            </Link>
          ) : null}
        </div>

        <form
          role="search"
          aria-label="Search blog stories"
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(searchParams.toString());
            const t = searchDraft.trim();
            if (t) next.set("q", t.slice(0, 200));
            else next.delete("q");
            const qs = next.toString();
            router.push(qs ? `/seva-blog?${qs}#stories` : "/seva-blog#stories");
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="blog-stories-search" className="block text-xs font-semibold uppercase tracking-wide text-[#8b6b5c]">
              Search stories
            </label>
            <input
              id="blog-stories-search"
              type="search"
              name="q"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Title, content, section, or author…"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-[#e8b4a0]/60 bg-white px-4 py-3 text-[#5a4538] shadow-sm outline-none ring-[#c49a8c] placeholder:text-[#a89890] focus:border-[#8b6b5c] focus:ring-2"
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#8b6b5c] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6b5344]"
            >
              Search
            </button>
            {qFromUrl ? (
              <button
                type="button"
                className="rounded-xl border border-[#e8b4a0] bg-white px-6 py-3 text-sm font-semibold text-[#6b5344] hover:bg-[#fdf2f0]"
                onClick={() => {
                  setSearchDraft("");
                  router.push("/seva-blog#stories");
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>

        {qFromUrl ? (
          <p className="mt-3 text-sm text-[#6b5344]">
            {postsLoading ? (
              <span>Searching…</span>
            ) : (
              <>
                {communityPosts.length === 1
                  ? "1 story matches"
                  : `${communityPosts.length} stories match`}
                {" "}
                <span className="font-semibold">&quot;{qFromUrl}&quot;</span>
              </>
            )}
          </p>
        ) : null}

        {postsLoading && !loading ? (
          <p className="mt-4 text-center text-sm text-[#8b6b5c]">Updating results…</p>
        ) : null}

        {postsFetchError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-800">
            {postsFetchError}
          </p>
        ) : null}

        {!postsLoading && !postsFetchError && communityPosts.length === 0 ? (
          <p className="mt-6 text-center text-[#7a6b65]">
            {qFromUrl
              ? `No stories match "${qFromUrl}". Try different words or clear the search.`
              : "No stories yet. Be the first to create a post above."}
          </p>
        ) : !postsLoading && !postsFetchError ? (
          <div className="mt-6 grid auto-rows-[minmax(0,1fr)] gap-6 sm:grid-cols-2 lg:grid-cols-3 landscape-desktop:grid-cols-3">
            {communityPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                onReaction={fetchCommunityPosts}
                isAdmin={isAdmin}
                canEditBlog={canEditBlog}
                onEditPost={(id) => setEditModal({ open: true, postId: id })}
                onDelete={fetchCommunityPosts}
              />
            ))}
          </div>
        ) : null}
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
        <BlogPostFormModal
          mode="create"
          createSection={createModal.section}
          onClose={() => setCreateModal((m) => ({ ...m, open: false }))}
          onSuccess={(opts) => {
            setCreateModal((m) => ({ ...m, open: false }));
            const newPostId = opts?.id;
            const pendingVerification = opts?.pendingVerification;
            const message = opts?.message;
            const textToShow =
              message ||
              (pendingVerification ? POST_SUBMIT_SUCCESS_MESSAGE : null);
            if (textToShow) {
              setTimeout(() => {
                setPostSubmitSuccessMessage(textToShow);
                setTimeout(
                  () => window.scrollTo({ top: 0, behavior: "smooth" }),
                  100
                );
              }, 150);
            }
            fetchCommunityPosts();
            if (newPostId && !pendingVerification) {
              router.push(`/seva-blog/post/${newPostId}`);
            }
          }}
        />
      )}
      {editModal?.open && editModal.postId ? (
        <BlogPostFormModal
          mode="edit"
          postId={editModal.postId}
          onClose={() => setEditModal(null)}
          onSuccess={(opts) => {
            if (opts?.saved) {
              setEditModal(null);
              fetchCommunityPosts();
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** Decode common HTML entities so excerpt/plain text doesn't show &amp; or &nbsp; etc. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  return decoded.replace(/\s+/g, " ").trim();
}

function CommunityPostCard({
  post,
  onReaction,
  isAdmin,
  canEditBlog,
  onEditPost,
  onDelete,
}: {
  post: CommunityPost;
  onReaction: () => void;
  isAdmin: boolean;
  canEditBlog: boolean;
  onEditPost: (id: string) => void;
  onDelete: () => void;
}) {
  const [reacting, setReacting] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white shadow-md transition hover:shadow-lg">
      <Link
        href={`/seva-blog/post/${post.id}`}
        className="flex min-h-0 flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b5c]/40 focus-visible:ring-offset-2"
      >
        <div className="relative flex h-[176px] w-full shrink-0 items-center justify-center overflow-hidden bg-[#f8e4e1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl.startsWith("http") ? imageUrl : imageUrl}
            alt={post.title}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <span className="text-xs leading-normal text-[#7a6b65]">{post.section}</span>
          <h4 className="mt-1 line-clamp-2 min-h-[3.5rem] font-serif text-lg font-semibold leading-snug text-[#6b5344]">
            {post.title}
          </h4>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-[#7a6b65]">
            {excerpt(plainContent, 80)}
          </p>
          <p className="mt-1 min-h-[1.125rem] text-xs leading-normal text-[#7a6b65]">
            {post.authorName ? `by ${post.authorName}` : "\u00a0"}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex shrink-0 flex-wrap items-center gap-2 border-t border-[#f8e4e1] px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
        {(canEditBlog || isAdmin) && (
          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onEditPost(post.id);
              }}
              className="rounded border border-[#8b6b5c] bg-white px-2 py-1 text-sm text-[#6b5344] hover:bg-[#fdf2f0]"
            >
              Edit
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  if (deleting) return;
                  if (!confirm("Delete this post? This cannot be undone.")) return;
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/admin/blog-posts/${post.id}`, {
                      method: "DELETE",
                      credentials: "include",
                    });
                    if (res.ok) {
                      onDelete();
                    } else {
                      const body = await res.json().catch(() => ({}));
                      alert(body?.error ?? "Failed to delete post.");
                    }
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="rounded border border-red-300 bg-red-50 px-2 py-1 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
