/**
 * Stable per-device identifier for blog reactions. The backend uses a `blog_uid`
 * cookie to dedupe likes/dislikes; mobile fetch doesn't persist Set-Cookie, so we
 * generate one once, store it, and send it explicitly on reaction requests.
 */

import * as SecureStore from "expo-secure-store";

const KEY = "blog_uid";
let cached: string | undefined;

function makeUid(): string {
  return `mob-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getBlogUid(): Promise<string> {
  if (cached) return cached;
  try {
    let v = await SecureStore.getItemAsync(KEY);
    if (!v) {
      v = makeUid();
      await SecureStore.setItemAsync(KEY, v);
    }
    cached = v;
    return v;
  } catch {
    cached = makeUid();
    return cached;
  }
}
