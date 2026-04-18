"use client";

import { useEffect, useMemo, useState } from "react";
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
import { RichTextEditor } from "./RichTextEditor";

const POST_SUBMIT_SUCCESS_MESSAGE =
  "Sairam. Thank you for taking the time to submit the post. It will be reviewed and published shortly. Jai Sairam !!";

const DEFAULT_PREVIEW_IMAGE = "/blog-right-swami.jpg";

type AdminBlogPostPayload = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  driveMediaLinks?: unknown;
  driveFolderUrl?: string | null;
  section: string;
  authorName: string | null;
  centerCity: string | null;
  sevaDate: string | null;
  sevaCategory: string | null;
  posterEmail: string | null;
  posterPhone: string | null;
  status: string;
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
    driveFolderUrl?: string | null;
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
  const [driveRows, setDriveRows] = useState<{ url: string; caption: string }[]>([
    { url: "", caption: "" },
  ]);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);
  const [driveUploadBusy, setDriveUploadBusy] = useState(false);
  const [driveMaxUploadMb, setDriveMaxUploadMb] = useState(25);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
        const rawLinks = (p as AdminBlogPostPayload).driveMediaLinks;
        if (Array.isArray(rawLinks) && rawLinks.length > 0) {
          const mapped = rawLinks
            .map((row: unknown) => {
              if (!row || typeof row !== "object") return null;
              const o = row as Record<string, unknown>;
              return {
                url: typeof o.url === "string" ? o.url : "",
                caption: typeof o.caption === "string" ? o.caption : "",
              };
            })
            .filter((x): x is { url: string; caption: string } => Boolean(x && x.url.trim()));
          setDriveRows(mapped.length > 0 ? mapped : [{ url: "", caption: "" }]);
        } else {
          setDriveRows([{ url: "", caption: "" }]);
        }
        const du =
          typeof p.driveFolderUrl === "string" && p.driveFolderUrl.startsWith("https://")
            ? p.driveFolderUrl
            : null;
        setDriveFolderUrl(du);
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

  async function handleDriveMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !postId) return;
    setError(null);
    setDriveUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/blog-posts/${postId}/drive-upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        driveFolderUrl?: string;
        driveMediaLinks?: unknown;
        appendedToMediaList?: boolean;
        mediaListFull?: boolean;
        maxUploadMb?: number;
      };
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error ?? "Upload failed"}: ${data.detail}`
          : data.error || "Upload failed.";
        throw new Error(msg);
      }
      if (typeof data.driveFolderUrl === "string" && data.driveFolderUrl.startsWith("https://")) {
        setDriveFolderUrl(data.driveFolderUrl);
      }
      if (typeof data.maxUploadMb === "number" && data.maxUploadMb > 0) {
        setDriveMaxUploadMb(data.maxUploadMb);
      }
      if (data.appendedToMediaList && Array.isArray(data.driveMediaLinks)) {
        const mapped = data.driveMediaLinks
          .map((row: unknown) => {
            if (!row || typeof row !== "object") return null;
            const o = row as Record<string, unknown>;
            return {
              url: typeof o.url === "string" ? o.url : "",
              caption: typeof o.caption === "string" ? o.caption : "",
            };
          })
          .filter((x): x is { url: string; caption: string } => Boolean(x && x.url.trim()));
        if (mapped.length > 0) {
          setDriveRows(mapped.length < 12 ? [...mapped, { url: "", caption: "" }] : mapped);
        }
      } else if (data.mediaListFull && !data.appendedToMediaList) {
        setError(
          "File uploaded to the folder, but the embedded media list is full (12). Remove a link below or open the folder in Drive."
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDriveUploadBusy(false);
      e.target.value = "";
    }
  }

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
    const driveMediaLinks = driveRows
      .map((r) => ({
        url: r.url.trim(),
        ...(r.caption.trim() ? { caption: r.caption.trim() } : {}),
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
        const dfu =
          typeof data.driveFolderUrl === "string" && data.driveFolderUrl.startsWith("https://")
            ? data.driveFolderUrl
            : null;
        onSuccess({ id: data.id, pendingVerification: pending, message, driveFolderUrl: dfu });
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
      const dfu =
        typeof data.driveFolderUrl === "string" && data.driveFolderUrl.startsWith("https://")
          ? data.driveFolderUrl
          : null;
      if (dfu) setDriveFolderUrl(dfu);
      onSuccess({ saved: true, id: postId, driveFolderUrl: dfu });
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
                  USA region (optional)
                </label>
                <p className="mt-0.5 text-xs text-[#7a6b65]">
                  Choose a region first to shorten the center list. If you pick
                  a center that maps to a region, the region updates
                  automatically.
                </p>
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
                <p className="mt-0.5 text-xs text-[#7a6b65]">
                  Used for regional analytics. List is filtered when a USA
                  region is selected above.
                </p>
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
                <p className="mt-0.5 text-xs text-[#7a6b65]">
                  Same categories as Find Seva and seva activities.
                </p>
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
              </div>
              {mode === "edit" && postId ? (
                <div className="rounded-lg border border-[#e8b4a0] bg-[#f8faf8] p-4">
                  <label className="block text-sm font-medium text-[#6b5344]">
                    This post’s Google Drive folder
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-[#7a6b65]">
                    One folder per post. Upload here (or in Drive) so all media for this story stays
                    together. The folder link is shown on the public post when present.
                  </p>
                  {driveFolderUrl ? (
                    <a
                      href={driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-sm font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]"
                    >
                      {driveFolderUrl}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-[#7a6b65]">
                      No folder yet. Upload a file below to create one automatically (if the server is
                      configured), or ask an admin to create the folder from the dashboard.
                    </p>
                  )}
                  <label className="mt-3 block text-sm font-medium text-[#6b5344]">
                    Upload into folder
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*,application/pdf"
                    onChange={handleDriveMediaUpload}
                    disabled={driveUploadBusy}
                    className="mt-1 w-full text-sm text-[#7a6b65] file:mr-2 file:rounded file:border-0 file:bg-[#fdf2f0] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#8b6b5c]"
                  />
                  {driveUploadBusy ? (
                    <p className="mt-1 text-xs text-[#7a6b65]">Uploading to Google Drive…</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#7a6b65]">
                    Server limit about {driveMaxUploadMb} MB per file (hosting limit). For larger
                    videos, open the folder link and upload in Google Drive.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e8b4a0] bg-[#f8faf8] p-4">
                  <p className="text-sm font-medium text-[#6b5344]">Google Drive folder for this post</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7a6b65]">
                    After you submit, you may receive a <strong>unique folder link</strong> for this
                    story (when the site is configured). Put all related photos, videos, and audio in
                    that folder — the same link appears on the blog post for readers.
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-dashed border-[#e8b4a0] bg-[#fffdfb] p-4">
                <label className="block text-sm font-medium text-[#6b5344]">
                  Extra photos, videos, or audio (Google Drive links, optional)
                </label>
                <p className="mt-1 text-xs leading-relaxed text-[#7a6b65]">
                  Alternatively, upload files to <strong>Google Drive</strong>, set sharing to{" "}
                  <strong>Anyone with the link</strong> (Viewer), then paste each file’s link below.
                  Use <strong>only</strong> media for this story — readers will only see what you list
                  here. Up to 12 links. Supported URLs: <code className="text-[11px]">drive.google.com</code>{" "}
                  or <code className="text-[11px]">docs.google.com</code>.
                </p>
                <div className="mt-3 space-y-3">
                  {driveRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 rounded-lg border border-[#f0ddd4] bg-white p-3 sm:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0 space-y-2 sm:col-span-1">
                        <input
                          type="url"
                          value={row.url}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDriveRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, url: v } : r))
                            );
                          }}
                          placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
                          className="w-full rounded-lg border border-[#e8b4a0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                        />
                        <input
                          type="text"
                          value={row.caption}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDriveRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, caption: v } : r))
                            );
                          }}
                          placeholder="Short caption (optional)"
                          className="w-full rounded-lg border border-[#e8b4a0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                        />
                      </div>
                      <div className="flex items-start justify-end gap-2 sm:flex-col">
                        {driveRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDriveRows((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                {driveRows.length < 12 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDriveRows((prev) => [...prev, { url: "", caption: "" }])
                    }
                    className="mt-3 text-sm font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]"
                  >
                    + Add another link
                  </button>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Full article *
                </label>
                <p className="mt-1 mb-2 text-xs text-[#7a6b65]">
                  The article body uses the <strong className="text-[#6b5344]">TipTap</strong> editor (toolbar
                  styling matches the previous version). Toolbar: fonts, sizes, bold, lists, links, Excel-style{" "}
                  <strong className="font-semibold text-[#6b5344]">Fill</strong> and{" "}
                  <strong className="font-semibold text-[#6b5344]">Font</strong> color,{" "}
                  <strong className="font-semibold text-[#6b5344]">Insert template</strong> (starter layouts).
                  Place the cursor where you want a template before choosing one.
                </p>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your full article here…"
                  minHeight="220px"
                />
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
