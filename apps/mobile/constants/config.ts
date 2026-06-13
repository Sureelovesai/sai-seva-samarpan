/**
 * Mobile app configuration.
 *
 * API_BASE_URL points at the same backend the web app uses (Next.js API routes).
 * Set it in apps/mobile/.env as:
 *   EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000        (dev, physical device / Expo Go)
 *   EXPO_PUBLIC_API_URL=https://your-app.vercel.app       (production)
 *
 * Note: on a physical device, "localhost" refers to the phone, not your computer,
 * so use your machine's LAN IP (e.g. http://192.168.1.99:3000).
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/** Name of the session cookie the backend expects (must match lib/auth.ts COOKIE_NAME on web). */
export const SESSION_COOKIE_NAME = "seva_session";
