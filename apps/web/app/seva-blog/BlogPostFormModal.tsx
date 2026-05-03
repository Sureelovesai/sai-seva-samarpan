"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BLOG_POST_SECTION_IDS,
  BLOG_POSTER_EMAIL_RE,
} from "@/lib/blogPostWriteValidation";
import { SEVA_CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import {
  USA_REGION_LABELS,
  getCitiesForUsaRegion,
  getUsaRegionForCity,
  isValidUsaRegion,
} from "@/lib/usaRegions";
import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";
import {
  ARTICLE_CANVAS_TEMPLATE_OPTIONS,
  DEFAULT_ARTICLE_CANVAS_PRESENTATION,
  normalizeArticleCanvasPresentation,
  normalizeBackdropPhotoUrl,
  type ArticleCanvasPresentation,
} from "@/lib/articleCanvasPresentation";
import { ArticleCanvasChrome } from "./ArticleCanvasChrome";
import { RichTextEditor } from "./RichTextEditor";

const POST_SUBMIT_SUCCESS_MESSAGE =
  "Sairam. Thank you for taking the time to submit the post. It will be reviewed and published shortly. Jai Sairam !!";

const DEFAULT_PREVIEW_IMAGE = "/blog-right-swami.jpg";

type DriveMediaRow = { url: string; caption: string; contentType?: string };

const R2_FILE_ACCEPT =
  "image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";

const BACKDROP_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
/** Matches `apps/web/app/api/blog-posts/upload/route.ts` */
const BACKDROP_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

/** Avoid R2 key collisions when two uploads use the same file name in one session. */
function uniqueUploadFileNameForR2(desired: string, existingPublicUrls: string[]): string {
  const basenameFromUrl = (u: string) => {
    try {
      const seg = u.split("/").pop() || "";
      return decodeURIComponent(seg);
    } catch {
      return "";
    }
  };
  const used = new Set(
    existingPublicUrls.map(basenameFromUrl).filter((s) => s.length > 0)
  );
  if (!used.has(desired)) return desired;
  const dot = desired.lastIndexOf(".");
  const base = dot >= 0 ? desired.slice(0, dot) : desired;
  const ext = dot >= 0 ? desired.slice(dot) : "";
  let n = 1;
  let candidate = `${base}_${n}${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}_${n}${ext}`;
  }
  return candidate;
}

type AdminBlogPostPayload = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  driveMediaLinks?: unknown;
  section: string;
  authorName: string | null;
  centerCity: string | null;
  sevaDate: string | null;
  sevaCategory: string | null;
  posterEmail: string | null;
  posterPhone: string | null;
  status: string;
  articleCanvas?: unknown;
};

export function BlogPostFormModal({
  mode,
  createSection,
  postId,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  /** When mode is "create", section from the card the user clicked */
  createSection?: string;
  /** When mode is "edit", post id to load and PATCH */
  postId?: string;
  onClose: () => void;
  onSuccess: (arg?: {
    id?: string;
    pendingVerification?: boolean;
    message?: string;
    saved?: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState(DEFAULT_PREVIEW_IMAGE);
  const [section, setSection] = useState(
    mode === "create" ? (createSection ?? BLOG_POST_SECTION_IDS[0]) : ""
  );
  const [usaRegion, setUsaRegion] = useState("");
  const [centerCity, setCenterCity] = useState("");
  const [sevaDate, setSevaDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [sevaCategory, setSevaCategory] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [posterEmail, setPosterEmail] = useState("");
  const [posterPhone, setPosterPhone] = useState("");
  const [r2MediaItems, setR2MediaItems] = useState<DriveMediaRow[]>([]);
  /** One R2 prefix per compose session (create) or real post id (edit) — all “Upload more media” files share this folder. */
  const [createR2FolderId] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `draft-${Date.now().toString(36)}`
  );
  /** Single subfolder under post id so every file in this modal is `blog/posts/{id}/{batch}/…`. */
  const [r2MediaBatchId] = useState(() => {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  });
  const [uploading, setUploading] = useState(false);
  const [backdropUploading, setBackdropUploading] = useState(false);
  const backdropImageFileInputRef = useRef<HTMLInputElement>(null);
  const [r2MoreBusy, setR2MoreBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [articleCanvas, setArticleCanvas] = useState<ArticleCanvasPresentation>(
    DEFAULT_ARTICLE_CANVAS_PRESENTATION
  );
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(mode === "edit");

  const centerOptions = useMemo(() => {
    if (!usaRegion || !isValidUsaRegion(usaRegion)) {
      return CITIES;
    }
    return [...getCitiesForUsaRegion(usaRegion)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [usaRegion]);

  function onRegionChange(next: string) {
    setUsaRegion(next);
    if (next && isValidUsaRegion(next)) {
      const allowed = new Set(getCitiesForUsaRegion(next));
      if (centerCity && !allowed.has(centerCity)) {
        setCenterCity("");
      }
    }
  }

  function onCenterChange(next: string) {
    setCenterCity(next);
    if (next.trim()) {
      const r = getUsaRegionForCity(next);
      if (r) setUsaRegion(r);
    }
  }

  useEffect(() => {
    if (mode !== "edit" || !postId) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/admin/blog-posts/${postId}`, {
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as
          | AdminBlogPostPayload
          | { error?: string };
        if (!res.ok) {
          throw new Error(
            typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "Could not load post for editing."
          );
        }
        const p = data as AdminBlogPostPayload;
        if (cancelled) return;
        setTitle(p.title ?? "");
        setContent(p.content ?? "");
        setImageUrl(p.imageUrl?.trim() || DEFAULT_PREVIEW_IMAGE);
        const sec = p.section?.trim() || BLOG_POST_SECTION_IDS[0];
        setSection(
          (BLOG_POST_SECTION_IDS as readonly string[]).includes(sec)
            ? sec
            : BLOG_POST_SECTION_IDS[0]
        );
        const c = p.centerCity?.trim() ?? "";
        setCenterCity(c);
        const r = c ? getUsaRegionForCity(c) : null;
        setUsaRegion(r || "");
        setSevaDate(
          p.sevaDate
            ? new Date(p.sevaDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        );
        setSevaCategory(p.sevaCategory?.trim() ?? "");
        setAuthorName(p.authorName?.trim() ?? "");
        setPosterEmail(p.posterEmail?.trim() ?? "");
        setPosterPhone(p.posterPhone?.trim() ?? "");
        setArticleCanvas(normalizeArticleCanvasPresentation(p.articleCanvas ?? null));
        setR2MediaItems(
          normalizeStoredDriveMedia((p as AdminBlogPostPayload).driveMediaLinks).map((m) => ({
            url: m.url,
            caption: m.caption ?? "",
            ...(m.contentType ? { contentType: m.contentType } : {}),
          }))
        );
      } catch (e) {
        if (!cancelled) {
          setLoadError((e as Error).message);
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, postId]);

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
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog-posts/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error}: ${data.detail}`
          : data.error || "Image upload failed.";
        throw new Error(msg);
      }
      setImageUrl(data.url);
    } catch (err) {
      const errMsg = (err as Error).message;
      setError(
        errMsg.includes("image") || errMsg.includes("Image")
          ? errMsg + " You can still submit your post without an image."
          : errMsg +
            " You can still submit your post without an image, or try a different image."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleBackdropImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowedMime = BACKDROP_IMAGE_ACCEPT.split(",") as string[];
    if (!allowedMime.includes(file.type)) {
      setError("Backdrop image: choose JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > BACKDROP_UPLOAD_MAX_BYTES) {
      setError("Backdrop image must be 4MB or smaller (same as post header uploads).");
      return;
    }
    setError(null);
    setBackdropUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/blog-posts/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error ?? "Upload failed"}: ${data.detail}`
          : data.error || "Upload failed.";
        throw new Error(msg);
      }
      if (!data.url) throw new Error("Upload did not return an image URL.");
      const url = normalizeBackdropPhotoUrl(data.url);
      if (!url) throw new Error("Server returned an invalid image URL.");
      setArticleCanvas((c) => ({ ...c, backdropPhotoUrl: url }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBackdropUploading(false);
    }
  }

  async function handleR2MoreMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (r2MediaItems.length >= 12) {
      setError("You can add at most 12 uploaded media files per post.");
      return;
    }
    setR2MoreBusy(true);
    try {
      const blogPostId =
        mode === "edit" && postId?.trim() ? postId.trim() : createR2FolderId;
      const fileNameForKey = uniqueUploadFileNameForR2(
        file.name,
        r2MediaItems.map((r) => r.url)
      );
      const pres = await fetch("/api/blog-posts/r2-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileNameForKey,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
          blogPostId,
          mediaBatchId: r2MediaBatchId,
        }),
      });
      const data = (await pres.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        uploadUrl?: string;
        publicUrl?: string;
        headers?: Record<string, string>;
      };
      if (!pres.ok) {
        const msg = data.detail
          ? `${data.error ?? "Request failed"}: ${data.detail}`
          : data.error || "Could not get upload URL.";
        throw new Error(
          pres.status === 503
            ? "Cloud storage (R2) is not configured on the server. Ask an admin to set R2 (see .env.example)."
            : msg
        );
      }
      const uploadUrl = data.uploadUrl;
      const publicUrl = data.publicUrl;
      if (!uploadUrl || !publicUrl) {
        throw new Error("Invalid response from server.");
      }
      const putHeaders: Record<string, string> = {
        ...(data.headers && typeof data.headers === "object" ? data.headers : {}),
      };
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: putHeaders });
      if (!put.ok) {
        throw new Error("Upload to cloud storage failed. Check your connection and try again.");
      }
      const ct = (file.type || putHeaders["Content-Type"] || "").trim() || undefined;
      const next: DriveMediaRow = {
        url: publicUrl,
        caption: "",
        ...(ct ? { contentType: ct } : {}),
      };
      setR2MediaItems((prev) => [...prev, next]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setR2MoreBusy(false);
    }
  }

  function isContentEmpty(html: string): boolean {
    const t = html.trim().replace(/<[^>]*>/g, "").trim();
    return !t || t === "\n";
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (isContentEmpty(content)) {
      setError("Content is required.");
      return;
    }
    if (mode === "edit" && !section.trim()) {
      setError("Please select a section.");
      return;
    }
    if (!centerCity.trim()) {
      setError("Please select a center / city.");
      return;
    }
    if (!sevaDate.trim()) {
      setError("Please enter the seva / story date.");
      return;
    }
    if (!sevaCategory.trim()) {
      setError("Please select a seva category.");
      return;
    }
    if (!authorName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!posterEmail.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!BLOG_POSTER_EMAIL_RE.test(posterEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    const effectiveSection =
      mode === "create" ? (createSection ?? section) : section;
    if (
      !(BLOG_POST_SECTION_IDS as readonly string[]).includes(effectiveSection)
    ) {
      setError("Invalid section.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const driveMediaLinks = r2MediaItems
      .map((r) => ({
        url: r.url.trim(),
        ...(r.caption.trim() ? { caption: r.caption.trim() } : {}),
        ...(r.contentType?.trim() ? { contentType: r.contentType.trim() } : {}),
      }))
      .filter((r) => r.url.length > 0);

    try {
      if (mode === "create") {
        const res = await fetch("/api/blog-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl.trim() || undefined,
            driveMediaLinks,
            articleCanvas,
            section: effectiveSection,
            centerCity: centerCity.trim(),
            sevaDate: sevaDate.trim(),
            sevaCategory: sevaCategory.trim(),
            authorName: authorName.trim(),
            posterEmail: posterEmail.trim(),
            ...(posterPhone.trim()
              ? { posterPhone: posterPhone.trim() }
              : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || "Failed to create post.";
          throw new Error(msg);
        }
        const pending =
          data.status === "PENDING_APPROVAL" ||
          !!data.message?.toLowerCase().includes("verification");
        const message = data.message || POST_SUBMIT_SUCCESS_MESSAGE;
        onSuccess({ id: data.id, pendingVerification: pending, message });
        return;
      }

      if (!postId) {
        throw new Error("Missing post id.");
      }
      const res = await fetch(`/api/admin/blog-posts/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          imageUrl: imageUrl.trim() || null,
          driveMediaLinks,
          articleCanvas,
          section: effectiveSection.trim(),
          centerCity: centerCity.trim(),
          sevaDate: sevaDate.trim(),
          sevaCategory: sevaCategory.trim(),
          authorName: authorName.trim(),
          posterEmail: posterEmail.trim(),
          posterPhone: posterPhone.trim() ? posterPhone.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error}: ${data.detail}`
          : data.error || "Failed to save changes.";
        throw new Error(msg);
      }
      onSuccess({ saved: true, id: postId });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const headerTitle =
    mode === "edit"
      ? "Edit post"
      : `Create A Post · ${createSection ?? section}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#e8b4a0] bg-white px-6 py-4">
          <h3 className="font-serif text-xl font-semibold text-[#6b5344]">
            {headerTitle}
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
          {initialLoading && (
            <p className="text-sm text-[#7a6b65]">Loading post…</p>
          )}
          {loadError && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {loadError}
            </p>
          )}
          {!initialLoading && !loadError && (
            <>
              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                  placeholder="Post title"
                />
              </div>
              {mode === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-[#6b5344]">
                    Section *
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#e8b4a0] bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                  >
                    {BLOG_POST_SECTION_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  USA region
                </label>
                <select
                  value={usaRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e8b4a0] bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                >
                  <option value="">All regions</option>
                  {USA_REGION_LABELS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Center / city *
                </label>
                <select
                  value={centerCity}
                  onChange={(e) => onCenterChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e8b4a0] bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                >
                  <option value="">Select center</option>
                  {centerOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Seva / story date *
                </label>
                <input
                  type="date"
                  value={sevaDate}
                  onChange={(e) => setSevaDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Seva category *
                </label>
                <select
                  value={sevaCategory}
                  onChange={(e) => setSevaCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e8b4a0] bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                >
                  <option value="">Select category</option>
                  {SEVA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#6b5344]">
                    Your name *
                  </label>
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                    placeholder="Name of person posting"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6b5344]">
                    Email *
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={posterEmail}
                    onChange={(e) => setPosterEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6b5344]">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={posterPhone}
                    onChange={(e) => setPosterPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-4 py-2 outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="mt-1 w-full text-sm text-[#7a6b65] file:mr-2 file:rounded file:border-0 file:bg-[#fdf2f0] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#8b6b5c]"
                />
                {uploading && (
                  <p className="mt-1 text-xs text-[#7a6b65]">Uploading…</p>
                )}
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
                <div className="mt-4 rounded-lg border border-[#e0d0c8] bg-[#faf8f6] p-3">
                  <label className="block text-sm font-medium text-[#6b5344]">
                    Upload more media
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-[#7a6b65]">
                    Add photos, video, audio, or documents.
                  </p>
                  <input
                    type="file"
                    accept={R2_FILE_ACCEPT}
                    onChange={handleR2MoreMediaUpload}
                    disabled={r2MoreBusy}
                    className="mt-2 w-full text-sm text-[#7a6b65] file:mr-2 file:rounded file:border-0 file:bg-[#fdf2f0] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#8b6b5c] disabled:opacity-50"
                  />
                  {r2MoreBusy ? (
                    <p className="mt-1 text-xs text-[#7a6b65]">Uploading to cloud storage…</p>
                  ) : null}
                </div>
                {r2MediaItems.length > 0 ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-dashed border-[#e8b4a0] bg-[#fffdfb] p-3">
                    <p className="text-sm font-medium text-[#6b5344]">Attached media (saved with this post)</p>
                    {r2MediaItems.map((row, idx) => (
                      <div
                        key={`${row.url}-${idx}`}
                        className="space-y-2 rounded-lg border border-[#f0ddd4] bg-white p-3"
                      >
                        <p className="break-all text-xs text-[#5c4d44]">{row.url}</p>
                        <input
                          type="text"
                          value={row.caption}
                          onChange={(e) => {
                            const v = e.target.value;
                            setR2MediaItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, caption: v } : r))
                            );
                          }}
                          placeholder="Short caption (optional)"
                          className="w-full rounded-lg border border-[#e8b4a0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setR2MediaItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Full article *
                </label>
                <div className="mt-3 space-y-2 rounded-lg border border-[#e0d0c8] bg-[#faf8f6] px-2 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#6b5344]">Article backdrop</p>
                    <p className="text-[11px] text-[#8b7368]">Behind the editor · saved with the post</p>
                  </div>
                  <div className="rounded-md border border-[#ebe3dc] bg-[#fefcfa] p-2">
                    <label className="block text-xs font-medium text-[#8b7355]">
                      Background image (optional)
                    </label>
                    <input
                      ref={backdropImageFileInputRef}
                      type="file"
                      accept={BACKDROP_IMAGE_ACCEPT}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden
                      onChange={handleBackdropImageFileChange}
                    />
                    <input
                      type="text"
                      value={articleCanvas.backdropPhotoUrl ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setArticleCanvas((c) => ({
                          ...c,
                          backdropPhotoUrl: v.trim() === "" ? null : v,
                        }));
                      }}
                      onBlur={() =>
                        setArticleCanvas((c) => ({
                          ...c,
                          backdropPhotoUrl: normalizeBackdropPhotoUrl(c.backdropPhotoUrl) ?? null,
                        }))
                      }
                      placeholder='https://… or same-site path, e.g. /uploads/blog/…'
                      className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-2 py-1.5 text-sm text-[#4a3f3a] outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                      autoComplete="off"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={backdropUploading}
                        onClick={() => backdropImageFileInputRef.current?.click()}
                        title="Uses the same storage as the post header image (max 4 MB)"
                        className="rounded-lg border border-[#c4b8a8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6b5344] hover:bg-[#fdf2f0] disabled:cursor-wait disabled:opacity-60"
                      >
                        {backdropUploading ? "Uploading…" : "Upload…"}
                      </button>
                      {articleCanvas.backdropPhotoUrl?.trim() ? (
                        <button
                          type="button"
                          onClick={() =>
                            setArticleCanvas((c) => ({ ...c, backdropPhotoUrl: null }))
                          }
                          className="rounded-lg border border-dashed border-[#c4a8a0] px-2.5 py-1.5 text-xs font-semibold text-[#8b6b5c] hover:bg-[#fff8f5]"
                        >
                          Clear image
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-[#8b7368]">
                      JPEG/PNG/WebP/GIF, max 4 MB — fills the URL. Clear for color-only. Paste a hosted URL if you prefer.
                    </p>
                    {articleCanvas.backdropPhotoUrl?.trim() ? (
                      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md border border-[#e8dccf] bg-white/80 px-2 py-1.5 text-[11px] text-[#4a3f3a]">
                        <input
                          type="checkbox"
                          checked={articleCanvas.backdropPhotoRepeat}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              backdropPhotoRepeat: e.target.checked,
                            }))
                          }
                          className="mt-0.5 shrink-0 accent-[#8b6b5c]"
                        />
                        <span>
                          <strong className="text-[#6b5344]">Tile backdrop</strong> — repeat this image as a pattern
                          behind long articles (textures, watermarks). Off = one large sheet{" "}
                          <span className="text-[#8b7368]">(cover, portrait-style frame).</span>
                        </span>
                      </label>
                    ) : null}
                  </div>
                  {articleCanvas.backdropPhotoUrl?.trim() ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                          Photo strength
                          <span className="tabular-nums text-[#6b5344]">
                            {articleCanvas.backdropPhotoOpacity.toFixed(2)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={articleCanvas.backdropPhotoOpacity}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              backdropPhotoOpacity: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                        />
                      </div>
                      <div>
                        <label
                          className="flex justify-between text-xs font-medium text-[#8b7355]"
                          title="Paper fade over photo (invitation look). Lower for a clearer portrait behind the article; raise if type gets hard to read."
                        >
                          Paper over photo
                          <span className="tabular-nums text-[#6b5344]">
                            {articleCanvas.backdropPhotoBleach.toFixed(2)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={0.92}
                          step={0.02}
                          value={articleCanvas.backdropPhotoBleach}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              backdropPhotoBleach: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                          title="Lower for clearer portrait; raise if text is hard to read."
                        />
                        <p className="mt-0.5 text-[10px] text-[#8b7368]">
                          Lower = clearer face; higher = easier reading on busy photos.
                        </p>
                      </div>
                      <div>
                        <label
                          className="flex justify-between text-xs font-medium text-[#8b7355]"
                          title="50 = centered horizontally. You should see the portrait slide left/right (no muddy blur hiding the shift)."
                        >
                          Photo ← →
                          <span className="tabular-nums text-[#6b5344]">
                            {Math.round(articleCanvas.backdropPhotoPosX)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={articleCanvas.backdropPhotoPosX}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              backdropPhotoPosX: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                        />
                        <p className="mt-0.5 text-[10px] text-[#8b7368]">50 = center · slide subject left/right.</p>
                      </div>
                      <div>
                        <label
                          className="flex justify-between text-xs font-medium text-[#8b7355]"
                          title="50 = centered. Lower = toward top of frame; higher = toward bottom (head vs feet on a portrait)."
                        >
                          Photo ↑ ↓
                          <span className="tabular-nums text-[#6b5344]">
                            {Math.round(articleCanvas.backdropPhotoPosY)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={articleCanvas.backdropPhotoPosY}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              backdropPhotoPosY: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                        />
                        <p className="mt-0.5 text-[10px] text-[#8b7368]">50 = center · frame head vs feet.</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-md border border-[#ebe3dc] bg-[#fefcfa] p-2">
                    <p className="mb-1.5 text-[11px] font-medium text-[#8b7355]">Sheet color &amp; tone</p>
                    <label className="block text-xs font-medium text-[#8b7355]">Color template</label>
                    <select
                      value={articleCanvas.templateId}
                      onChange={(e) =>
                        setArticleCanvas((c) => ({ ...c, templateId: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#e8b4a0] bg-white px-2 py-1.5 text-sm text-[#4a3f3a] outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                    >
                      {ARTICLE_CANVAS_TEMPLATE_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                          Brightness
                          <span className="tabular-nums text-[#6b5344]">
                            {articleCanvas.brightness.toFixed(2)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0.55}
                          max={1.45}
                          step={0.05}
                          value={articleCanvas.brightness}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              brightness: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                        />
                      </div>
                      <div>
                        <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                          Light wash
                          <span className="tabular-nums text-[#6b5344]">
                            {articleCanvas.lightWash.toFixed(2)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={0.85}
                          step={0.05}
                          value={articleCanvas.lightWash}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({
                              ...c,
                              lightWash: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                          title="Fade toward white"
                        />
                      </div>
                      <div>
                        <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                          Shadow dim
                          <span className="tabular-nums text-[#6b5344]">
                            {articleCanvas.dim.toFixed(2)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={0.65}
                          step={0.05}
                          value={articleCanvas.dim}
                          onChange={(e) =>
                            setArticleCanvas((c) => ({ ...c, dim: Number(e.target.value) }))
                          }
                          className="mt-1 w-full accent-[#8b6b5c]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 mb-1 text-[11px] text-[#7a6b65]">
                  Toolbar: fonts, lists, links, colors, <strong className="text-[#6b5344]">Image ▼</strong>. Place the
                  cursor before inserting a template block.
                </p>
                <ArticleCanvasChrome presentation={articleCanvas} showFrame>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Write your full article here…"
                    minHeight="180px"
                    surface="canvas"
                  />
                </ArticleCanvasChrome>
              </div>
            </>
          )}
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
            onClick={handleSubmit}
            disabled={
              submitting ||
              r2MoreBusy ||
              initialLoading ||
              !!loadError ||
              isContentEmpty(content)
            }
            className="rounded-lg bg-[#8b6b5c] px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
          >
            {submitting
              ? mode === "edit"
                ? "Saving…"
                : "Submitting…"
              : mode === "edit"
                ? "Save changes"
                : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
