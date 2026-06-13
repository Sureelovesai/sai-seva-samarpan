/**
 * API client for the shared backend (Next.js API routes used by the web app).
 *
 * Auth: the backend reads the JWT from a `seva_session` cookie. React Native lets us
 * set the Cookie header manually, so after login we store the token (SecureStore) and
 * attach it as `Cookie: seva_session=<token>` on every request, so every existing web
 * API route works for mobile with no per-route changes.
 */

import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, SESSION_COOKIE_NAME } from "@/constants/config";

const TOKEN_KEY = "seva_session_token";

let cachedToken: string | null | undefined; // undefined = not loaded yet

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    cachedToken = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore storage errors; cachedToken still applies for this session
  }
}

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
  noAuth?: boolean;
  /** Extra cookies to send alongside the session (e.g. blog_uid for blog reactions). */
  cookies?: Record<string, string>;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { json, noAuth, cookies, headers, ...rest } = options;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (json !== undefined) finalHeaders["Content-Type"] = "application/json";

  const cookieParts: string[] = [];
  if (!noAuth) {
    const token = await getToken();
    if (token) cookieParts.push(`${SESSION_COOKIE_NAME}=${token}`);
  }
  if (cookies) {
    for (const [k, v] of Object.entries(cookies)) cookieParts.push(`${k}=${v}`);
  }
  if (cookieParts.length > 0) finalHeaders["Cookie"] = cookieParts.join("; ");

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body,
    });
  } catch (e) {
    throw new ApiError(
      "Network error — check your connection and that the server is reachable.",
      0,
      e instanceof Error ? e.message : String(e)
    );
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const message =
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.message === "string" && obj.message) ||
      `Request failed (${res.status})`;
    const detail = typeof obj.detail === "string" ? obj.detail : undefined;
    throw new ApiError(message, res.status, detail);
  }

  return data as T;
}
