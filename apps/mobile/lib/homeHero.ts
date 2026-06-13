import { API_BASE_URL } from "@/constants/config";

/**
 * Mobile portrait hero only — same chain as web `HERO_BANNER_MOBILE_PORTRAIT_SRCS`.
 * Desktop / wide banners are intentionally excluded on the native app.
 */
const MOBILE_PORTRAIT_PATHS = [
  "/mobile-home.jpg",
  "/mobile-home.JPG",
  "/mobile_copy_newest.PNG",
  "/mobile_copy_newest.png",
];

export const HOME_HERO_BANNER_URLS = MOBILE_PORTRAIT_PATHS.map((path) => `${API_BASE_URL}${path}`);

/** Actual `public/mobile-home.jpg` pixels (1080×1650) — not 9:16. */
export const HOME_HERO_PORTRAIT_ASPECT = 1080 / 1650;

/** Bundled portrait hero — always available offline. */
export const HOME_HERO_LOCAL = require("@/assets/images/home-hero.jpg");

/** Site header logo (Sri Sathya Sai Seva Samarpan) — same as web `SiteHeader`. */
export const SITE_LOGO_URL = `${API_BASE_URL}/logo.png`;
export const SITE_LOGO_LOCAL = require("@/assets/images/logo.png");

export const FEATURED_DEFAULT_IMAGE = `${API_BASE_URL}/manage-hero-swami.svg`;
