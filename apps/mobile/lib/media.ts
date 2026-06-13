import { API_BASE_URL, SESSION_COOKIE_NAME } from "@/constants/config";
import { ApiError, getToken } from "@/lib/api";

/**
 * Resolve an image URL coming from the API. Dev uploads return relative paths
 * (e.g. /uploads/blog/x.jpg); prefix those with the API host so RN can load them.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function guessContentType(uri: string): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

async function uploadTo(endpoint: string, uri: string, withAuth: boolean): Promise<string> {
  const contentType = guessContentType(uri);
  const ext = contentType.split("/")[1] ?? "jpg";
  const name = `mobile-${Date.now()}.${ext}`;

  const form = new FormData();
  // React Native FormData file shape.
  form.append("file", {
    uri,
    name,
    type: contentType,
  } as unknown as Blob);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (withAuth) {
    const token = await getToken();
    if (token) headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: form,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    const msg =
      (data as { error?: string; detail?: string })?.detail ||
      (data as { error?: string })?.error ||
      "Image upload failed.";
    throw new ApiError(msg, res.status);
  }

  const url = (data as { url?: string })?.url;
  if (!url) throw new ApiError("Upload did not return a URL.", res.status);
  return url;
}

/** Upload a blog image (public endpoint). Returns the stored URL. */
export function uploadBlogImage(uri: string): Promise<string> {
  return uploadTo("/api/blog-posts/upload", uri, false);
}

/** Upload a seva activity image (admin endpoint, needs auth). Returns the stored URL. */
export function uploadActivityImage(uri: string): Promise<string> {
  return uploadTo("/api/admin/upload-activity-image", uri, true);
}

/** Upload a community partner logo (needs auth). Returns the stored URL. */
export function uploadCommunityLogo(uri: string): Promise<string> {
  return uploadTo("/api/community-outreach/upload-logo", uri, true);
}

/** Upload a portal-event asset (hero image or flyer). Returns the stored URL. */
export async function uploadEventAsset(uri: string, kind: "hero" | "flyer"): Promise<string> {
  const contentType = guessContentType(uri);
  const ext = contentType.split("/")[1] ?? "jpg";
  const name = `event-${kind}-${Date.now()}.${ext}`;

  const form = new FormData();
  form.append("file", { uri, name, type: contentType } as unknown as Blob);
  form.append("kind", kind);

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = await getToken();
  if (token) headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;

  const res = await fetch(`${API_BASE_URL}/api/admin/upload-event-asset`, {
    method: "POST",
    headers,
    body: form,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const msg =
      (data as { error?: string; detail?: string })?.detail ||
      (data as { error?: string })?.error ||
      "Upload failed.";
    throw new ApiError(msg, res.status);
  }
  const url = (data as { url?: string })?.url;
  if (!url) throw new ApiError("Upload did not return a URL.", res.status);
  return url;
}
