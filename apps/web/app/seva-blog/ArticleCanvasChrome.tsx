"use client";

import type { CSSProperties } from "react";
import { forwardRef } from "react";
import type { ArticleCanvasPresentation } from "@/lib/articleCanvasPresentation";
import { getArticleCanvasChromeStyles } from "@/lib/articleCanvasPresentation";

export const ArticleCanvasChrome = forwardRef<
  HTMLDivElement,
  {
    presentation: ArticleCanvasPresentation;
    children: React.ReactNode;
    className?: string;
    /** Extra classes on the inner reading panel (e.g. prose / blog-post-content). */
    contentClassName?: string;
    contentStyle?: CSSProperties;
    /** Optional frame around the canvas (matches editor chrome). */
    showFrame?: boolean;
  }
>(function ArticleCanvasChrome(
  { presentation, children, className = "", contentClassName = "", contentStyle, showFrame = true },
  ref
) {
  const s = getArticleCanvasChromeStyles(presentation);
  const hasBackdropPhoto = Boolean(presentation.backdropPhotoUrl?.trim());

  return (
    <div
      ref={ref}
      className={`${
        showFrame
          ? "relative overflow-hidden rounded-xl border border-[#e8c4b8] shadow-sm"
          : "relative overflow-hidden rounded-xl"
      } ${className}`}
      style={s.root}
    >
      <div
        key={s.decorKey}
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        aria-hidden
      >
        <div style={s.bgLayer} />
        {s.photoLayer ? (
          <div
            key={`bp-${presentation.backdropPhotoPosX}-${presentation.backdropPhotoPosY}-${presentation.backdropPhotoRepeat ? "r" : "c"}`}
            style={s.photoLayer}
          />
        ) : null}
        {s.photoBleachLayer ? <div style={s.photoBleachLayer} /> : null}
        <div style={s.darkVeil} />
        <div style={s.lightVeil} />
      </div>
      <div className={contentClassName} style={{ ...s.contentShell, ...contentStyle }}>
        {hasBackdropPhoto ? (
          <div className="flex min-h-0 w-full flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
});
