"use client";

import { useEffect } from "react";

/**
 * When `/seva-mahotsavam` is embedded in an iframe, the global `body > main` flex column
 * (`min-h-screen` + `main` `flex-1 min-h-0`) can pin `main` to the iframe viewport height
 * and yield a second scrollbar next to the content. Relax flex/overflow on this subtree’s
 * route so the document grows with content and only the normal (or parent-sized) scroll applies.
 */
export default function SevaMahotsavamLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const main = document.querySelector("main");

    const prev: {
      htmlOverflowY: string;
      bodyOverflowY: string;
      bodyMinHeight: string;
      mainFlex: string;
      mainMinHeight: string;
      mainOverflow: string;
    } = {
      htmlOverflowY: html.style.overflowY,
      bodyOverflowY: body.style.overflowY,
      bodyMinHeight: body.style.minHeight,
      mainFlex: "",
      mainMinHeight: "",
      mainOverflow: "",
    };

    html.style.overflowY = "auto";

    body.style.overflowY = "visible";
    body.style.minHeight = "min-content";

    if (main instanceof HTMLElement) {
      prev.mainFlex = main.style.flex;
      prev.mainMinHeight = main.style.minHeight;
      prev.mainOverflow = main.style.overflow;
      main.style.flex = "none";
      main.style.minHeight = "min-content";
      main.style.overflow = "visible";
      main.classList.remove("min-h-0");
    }

    return () => {
      html.style.overflowY = prev.htmlOverflowY;
      body.style.overflowY = prev.bodyOverflowY;
      body.style.minHeight = prev.bodyMinHeight;
      if (main instanceof HTMLElement) {
        main.style.flex = prev.mainFlex;
        main.style.minHeight = prev.mainMinHeight;
        main.style.overflow = prev.mainOverflow;
        main.classList.add("min-h-0");
      }
    };
  }, []);

  return <>{children}</>;
}
