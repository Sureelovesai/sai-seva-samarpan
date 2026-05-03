import type { CSSProperties } from "react";

/**
 * Saved on BlogPost.articleCanvas — article body backdrop (editor, public view, PDF via html2pdf).
 * Inline styles only so html2canvas + clone path matches the screen.
 */
export type ArticleCanvasPresentation = {
  templateId: string;
  /** Multiplier for template luminance (0.55–1.45). */
  brightness: number;
  /** White veil over decorative layer (0–0.85) — softens / “fades” toward paper. */
  lightWash: number;
  /** Dark veil over decorative layer (0–0.65). */
  dim: number;
  /**
   * Invitation-style backdrop image (`https://…` or same-site path). Shown behind the color template,
   * with strength + “paper” fade for readable type.
   */
  backdropPhotoUrl: string | null;
  /** How strong the photo shows through (0–1). */
  backdropPhotoOpacity: number;
  /** White vellum over the photo so text reads like a printed invitation (0–0.92). */
  backdropPhotoBleach: number;
  /**
   * `background-position` for the backdrop photo (percentage). 50 = center horizontally;
   * lower = shifts focal point toward the left, higher toward the bottom for Y.
   */
  backdropPhotoPosX: number;
  backdropPhotoPosY: number;
  /**
   * When true, the backdrop photo tiles (`repeat` + natural size) as the article grows — good for patterns/textures.
   * When false, one sheet uses `cover` (portrait/watermark style) with the tall min-height frame.
   */
  backdropPhotoRepeat: boolean;
};

export const DEFAULT_ARTICLE_CANVAS_PRESENTATION: ArticleCanvasPresentation = {
  templateId: "cream",
  brightness: 1,
  lightWash: 0,
  dim: 0,
  backdropPhotoUrl: null,
  /** Stronger defaults so the portrait reads clearly behind the frost. */
  backdropPhotoOpacity: 0.88,
  backdropPhotoBleach: 0.12,
  /** Slightly left of center + a bit toward the bottom (classic portrait framing). */
  backdropPhotoPosX: 42,
  backdropPhotoPosY: 62,
  backdropPhotoRepeat: false,
};

/**
 * When a sheet backdrop photo exists, keep the frame at least this tall so `background-size: cover`
 * is not clipped to a few lines of text (editor, public post, PDF).
 */
export const ARTICLE_CANVAS_PHOTO_MIN_HEIGHT = "clamp(400px, min(72vh, 56rem), 920px)";

/** Key only the decorative stack (never the TipTap subtree) — fixes stale gradients when switching templates. */
export function getArticleBackdropDecorKey(p: {
  templateId: string;
  backdropPhotoUrl: string | null;
  backdropPhotoRepeat?: boolean;
}): string {
  return `${p.templateId}|${p.backdropPhotoUrl ?? ""}|${p.backdropPhotoRepeat ? "1" : "0"}`;
}

const TEMPLATES: Record<string, { label: string; background: CSSProperties }> = {
  cream: {
    label: "Soft cream",
    background: {
      background: "linear-gradient(165deg, #fffdfb 0%, #fef8f4 40%, #f5ebe4 100%)",
    },
  },
  warmPaper: {
    label: "Warm paper",
    background: {
      backgroundColor: "#faf4ec",
      backgroundImage:
        "repeating-linear-gradient(180deg, transparent, transparent 23px, rgba(180, 160, 140, 0.06) 24px)",
    },
  },
  mist: {
    label: "Cool mist",
    background: {
      background: "linear-gradient(135deg, #f0f7fa 0%, #fafdfe 55%, #ffffff 100%)",
    },
  },
  sage: {
    label: "Sage tint",
    background: {
      background: "linear-gradient(180deg, #f4faf6 0%, #fbfdf8 70%, #f8f4ef 100%)",
    },
  },
  blush: {
    label: "Blush rose",
    background: {
      background: "radial-gradient(120% 80% at 20% 10%, #fff2ee 0%, #fef9f6 45%, #faf5f0 100%)",
    },
  },
  dawn: {
    label: "Golden dawn",
    background: {
      background: "linear-gradient(125deg, #fff9f0 0%, #fef3e0 35%, #f8ead8 100%)",
    },
  },
  lotus: {
    label: "Lotus pool",
    background: {
      background:
        "linear-gradient(160deg, #f2faf5 0%, #f8f6ec 40%, #f5f0fa 85%, #faf8f5 100%)",
    },
  },
};

export const ARTICLE_CANVAS_TEMPLATE_OPTIONS = Object.entries(TEMPLATES).map(([id, v]) => ({
  id,
  label: v.label,
}));

export function isValidArticleCanvasTemplateId(id: string): boolean {
  return id in TEMPLATES;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Same rules as inline blog images — safe origins only. */
export function normalizeBackdropPhotoUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const u = raw.trim();
  if (!u) return null;
  if (/^https:\/\//i.test(u)) return u;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  return null;
}

export function normalizeArticleCanvasPresentation(raw: unknown): ArticleCanvasPresentation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_ARTICLE_CANVAS_PRESENTATION };
  }
  const o = raw as Record<string, unknown>;
  const templateId =
    typeof o.templateId === "string" && isValidArticleCanvasTemplateId(o.templateId)
      ? o.templateId
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.templateId;
  const brightness =
    typeof o.brightness === "number" && Number.isFinite(o.brightness)
      ? clamp(o.brightness, 0.55, 1.45)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.brightness;
  const lightWash =
    typeof o.lightWash === "number" && Number.isFinite(o.lightWash)
      ? clamp(o.lightWash, 0, 0.85)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.lightWash;
  const dim =
    typeof o.dim === "number" && Number.isFinite(o.dim)
      ? clamp(o.dim, 0, 0.65)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.dim;

  const backdropPhotoUrl = normalizeBackdropPhotoUrl(o.backdropPhotoUrl);
  const backdropPhotoOpacity =
    typeof o.backdropPhotoOpacity === "number" && Number.isFinite(o.backdropPhotoOpacity)
      ? clamp(o.backdropPhotoOpacity, 0, 1)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.backdropPhotoOpacity;
  const backdropPhotoBleach =
    typeof o.backdropPhotoBleach === "number" && Number.isFinite(o.backdropPhotoBleach)
      ? clamp(o.backdropPhotoBleach, 0, 0.92)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.backdropPhotoBleach;
  const backdropPhotoPosX =
    typeof o.backdropPhotoPosX === "number" && Number.isFinite(o.backdropPhotoPosX)
      ? clamp(o.backdropPhotoPosX, 0, 100)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.backdropPhotoPosX;
  const backdropPhotoPosY =
    typeof o.backdropPhotoPosY === "number" && Number.isFinite(o.backdropPhotoPosY)
      ? clamp(o.backdropPhotoPosY, 0, 100)
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.backdropPhotoPosY;
  const backdropPhotoRepeat =
    typeof o.backdropPhotoRepeat === "boolean"
      ? o.backdropPhotoRepeat
      : DEFAULT_ARTICLE_CANVAS_PRESENTATION.backdropPhotoRepeat;

  return {
    templateId,
    brightness,
    lightWash,
    dim,
    backdropPhotoUrl,
    backdropPhotoOpacity,
    backdropPhotoBleach,
    backdropPhotoPosX,
    backdropPhotoPosY,
    backdropPhotoRepeat,
  };
}

function cssUrl(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}

export function getArticleCanvasChromeStyles(p: ArticleCanvasPresentation): {
  root: CSSProperties;
  decorKey: string;
  bgLayer: CSSProperties;
  photoLayer: CSSProperties | null;
  photoBleachLayer: CSSProperties | null;
  darkVeil: CSSProperties;
  lightVeil: CSSProperties;
  contentShell: CSSProperties;
} {
  const preset = TEMPLATES[p.templateId] ?? TEMPLATES.cream;
  const b = clamp(p.brightness, 0.55, 1.45);
  const light = clamp(p.lightWash, 0, 0.85);
  const dim = clamp(p.dim, 0, 0.65);
  const photoUrl = p.backdropPhotoUrl;
  const photoOp = clamp(p.backdropPhotoOpacity, 0, 1);
  const photoBleach = clamp(p.backdropPhotoBleach, 0, 0.92);
  const posX = clamp(p.backdropPhotoPosX, 0, 100);
  const posY = clamp(p.backdropPhotoPosY, 0, 100);
  const photoRepeat = Boolean(p.backdropPhotoRepeat);
  /** Slight sharpening so the watermark reads a bit clearer (still softened by bleach + frost). */
  const photoFilter = `brightness(${b}) contrast(1.06) saturate(1.05)`;
  const filterBright = `brightness(${b})`;

  const photoLayer: CSSProperties | null =
    photoUrl && photoOp > 0
      ? {
          position: "absolute",
          inset: 0,
          backgroundImage: cssUrl(photoUrl),
          ...(photoRepeat
            ? {
                backgroundSize: "auto",
                backgroundPosition: `${posX}% ${posY}%`,
                backgroundRepeat: "repeat",
              }
            : {
                backgroundSize: "cover",
                backgroundPosition: `${posX}% ${posY}%`,
                backgroundRepeat: "no-repeat",
              }),
          opacity: photoOp,
          filter: photoFilter,
          transform: "translateZ(0)",
        }
      : null;

  const photoBleachLayer: CSSProperties | null =
    photoUrl && photoBleach > 0
      ? {
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(255,255,255,${photoBleach})`,
          pointerEvents: "none",
          transform: "translateZ(0)",
        }
      : null;

  return {
    root: {
      position: "relative",
      ...(photoUrl && !photoRepeat
        ? {
            display: "flex",
            flexDirection: "column",
            minHeight: ARTICLE_CANVAS_PHOTO_MIN_HEIGHT,
          }
        : photoUrl
          ? {
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }
          : {}),
    },
    decorKey: getArticleBackdropDecorKey(p),
    bgLayer: {
      ...preset.background,
      position: "absolute",
      inset: 0,
      filter: filterBright,
      transform: "translateZ(0)",
    },
    photoLayer,
    photoBleachLayer,
    darkVeil: {
      position: "absolute",
      inset: 0,
      backgroundColor: `rgba(0,0,0,${dim})`,
      pointerEvents: "none",
    },
    lightVeil: {
      position: "absolute",
      inset: 0,
      backgroundColor: `rgba(255,255,255,${light})`,
      pointerEvents: "none",
    },
    contentShell: {
      position: "relative",
      zIndex: 10,
      // Backdrop-blur turns the watermark into a muddy halo. With a portrait, use tint only — photo stays sharp.
      ...(photoUrl
        ? {
            backgroundColor: "rgba(252, 248, 244, 0.66)",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }
        : {
            backgroundColor: "rgba(255, 253, 251, 0.52)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }),
      padding: "14px 16px",
      borderRadius: "10px",
    },
  };
}
