"use client";

import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import type { ChainedCommands } from "@tiptap/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const FONT_SIZES = [
  { value: "0.75rem", label: "Small" },
  { value: "1rem", label: "Normal" },
  { value: "1.125rem", label: "Medium" },
  { value: "1.25rem", label: "Large" },
  { value: "1.5rem", label: "X-Large" },
  { value: "1.875rem", label: "Huge" },
] as const;

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Sans Serif", value: "Arial, sans-serif" },
  { label: "Monospace", value: "monospace" },
] as const;

/** Preset highlight / fill colors — pick swatch here; ▼ opens this list plus “Custom…” for full picker. */
const FILL_COLOR_PRESETS: { hex: string; title: string }[] = [
  { hex: "#ffffff", title: "White" },
  { hex: "#f5f5f5", title: "Light gray" },
  { hex: "#e0e0e0", title: "Gray" },
  { hex: "#fff9c4", title: "Light yellow" },
  { hex: "#fff59d", title: "Yellow" },
  { hex: "#ffe082", title: "Gold" },
  { hex: "#ffccbc", title: "Peach" },
  { hex: "#ffcdd2", title: "Pink" },
  { hex: "#f8bbd0", title: "Rose" },
  { hex: "#e1bee7", title: "Lavender" },
  { hex: "#d1c4e9", title: "Soft purple" },
  { hex: "#c5cae9", title: "Periwinkle" },
  { hex: "#bbdefb", title: "Light blue" },
  { hex: "#b3e5fc", title: "Sky" },
  { hex: "#b2dfdb", title: "Mint" },
  { hex: "#c8e6c9", title: "Light green" },
  { hex: "#dcedc8", title: "Sage" },
  { hex: "#dce775", title: "Lime" },
  { hex: "#ffe0b2", title: "Apricot" },
  { hex: "#d7ccc8", title: "Taupe" },
];

/** Preset font (text) colors — readable on light backgrounds */
const FONT_COLOR_PRESETS: { hex: string; title: string }[] = [
  { hex: "#000000", title: "Black" },
  { hex: "#212121", title: "Charcoal" },
  { hex: "#424242", title: "Dark gray" },
  { hex: "#4a3f3a", title: "Warm brown (default tone)" },
  { hex: "#5d4037", title: "Brown" },
  { hex: "#6b5344", title: "Theme brown" },
  { hex: "#8b4513", title: "Saddle brown" },
  { hex: "#b22222", title: "Brick red" },
  { hex: "#c62828", title: "Red" },
  { hex: "#ad1457", title: "Magenta" },
  { hex: "#6a1b9a", title: "Purple" },
  { hex: "#283593", title: "Indigo" },
  { hex: "#1565c0", title: "Blue" },
  { hex: "#0277bd", title: "Sky blue" },
  { hex: "#00695c", title: "Teal" },
  { hex: "#2e7d32", title: "Green" },
  { hex: "#558b2f", title: "Olive" },
  { hex: "#f57f17", title: "Amber" },
  { hex: "#ef6c00", title: "Orange" },
  { hex: "#37474f", title: "Blue gray" },
];

/** Excel-style paint bucket (fill) — inline SVG */
function IconFillColor({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
    >
      <path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12L16.56 8.94zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z" />
    </svg>
  );
}

const BlogImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style as string };
        },
      },
    };
  },
});

function normalizeEmptyHtml(html: string): string {
  const t = html.trim();
  if (!t || t === "<p></p>" || t === "<p><br></p>") return "";
  return html;
}

function isAllowedInlineImageSrc(url: string): boolean {
  const u = url.trim();
  if (/^https:\/\//i.test(u)) return true;
  if (u.startsWith("/") && !u.startsWith("//")) return true;
  return false;
}

type ImagePlacementLayout = "full" | "center" | "float-left" | "float-right";

function buildBlogImageStyle(
  layout: ImagePlacementLayout,
  widthPct: number,
  spacing: "tight" | "normal" | "loose",
  vertBias: "balanced" | "above" | "below"
): string {
  const w = Math.min(100, Math.max(25, Math.round(widthPct)));
  let vBase = spacing === "tight" ? 8 : spacing === "loose" ? 20 : 12;
  const h = spacing === "tight" ? 10 : spacing === "loose" ? 24 : 16;
  const extraTop = vertBias === "above" ? 20 : 0;
  const extraBot = vertBias === "below" ? 20 : 0;

  switch (layout) {
    case "full":
      return `display:block;width:100%;max-width:${w}%;height:auto;margin-top:${vBase + extraTop}px;margin-bottom:${vBase + extraBot}px;margin-left:auto;margin-right:auto;clear:both;`;
    case "center":
      return `display:block;width:auto;max-width:${w}%;height:auto;margin-top:${vBase + extraTop}px;margin-bottom:${vBase + extraBot}px;margin-left:auto;margin-right:auto;clear:both;`;
    case "float-left":
      return `float:left;clear:left;max-width:${w}%;width:auto;height:auto;margin-top:${vBase + extraTop}px;margin-bottom:${vBase + extraBot}px;margin-right:${h}px;margin-left:0;`;
    case "float-right":
      return `float:right;clear:right;max-width:${w}%;width:auto;height:auto;margin-top:${vBase + extraTop}px;margin-bottom:${vBase + extraBot}px;margin-left:${h}px;margin-right:0;`;
    default:
      return `display:block;width:100%;max-width:${w}%;height:auto;margin:12px auto;clear:both;`;
  }
}

const IMAGE_WIDTH_PRESETS = [100, 75, 66, 50, 33, 25] as const;

const IMAGE_LAYOUT_OPTIONS: {
  id: ImagePlacementLayout;
  label: string;
  hint: string;
}[] = [
  { id: "full", label: "Full-width block", hint: "Stretches to the row up to max width %" },
  { id: "center", label: "Centered", hint: "Natural size up to max width %" },
  { id: "float-left", label: "Float left", hint: "Text wraps on the right" },
  { id: "float-right", label: "Float right", hint: "Text wraps on the left" },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your article…",
  className = "",
  minHeight = "200px",
  /** When `canvas`, the editable surface is transparent so a parent `ArticleCanvasChrome` shows through. */
  surface = "card",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  surface?: "card" | "canvas";
}) {
  const onChangeRef = useRef(onChange);
  /**
   * Toolbar clicks blur the editor and often collapse the selection before we read it.
   * We stash on pointer/mouse capture, fall back to last non-empty range briefly after,
   * validate positions, then restore before applying marks.
   */
  const toolbarSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const lastNonEmptyRangeRef = useRef<{ from: number; to: number } | null>(null);
  const lastNonEmptyAtMsRef = useRef(0);

  /** Last chosen colors — Excel-style: main button applies these to the selection */
  const [fillColor, setFillColor] = useState("#fff9c4");
  const [fontColor, setFontColor] = useState("#4a3f3a");
  const [fillPaletteOpen, setFillPaletteOpen] = useState(false);
  const fillPaletteContainerRef = useRef<HTMLDivElement>(null);
  const fillPaletteDropdownRef = useRef<HTMLDivElement>(null);
  const fillCustomColorInputRef = useRef<HTMLInputElement>(null);
  const [fillPalettePos, setFillPalettePos] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const [fontPaletteOpen, setFontPaletteOpen] = useState(false);
  const fontPaletteContainerRef = useRef<HTMLDivElement>(null);
  const fontPaletteDropdownRef = useRef<HTMLDivElement>(null);
  const fontCustomColorInputRef = useRef<HTMLInputElement>(null);
  const [fontPalettePos, setFontPalettePos] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const imageMenuAnchorRef = useRef<HTMLDivElement>(null);
  const imageMenuPanelRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  /** After the current placement, insert these URLs (same order as selected files). */
  const pendingImageQueueRef = useRef<string[]>([]);
  const [imageMenuPos, setImageMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [imageUploading, setImageUploading] = useState(false);

  const [imagePlacementOpen, setImagePlacementOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  /** When uploading several files at once, show “2 of 5” in the placement dialog. */
  const [placementBatch, setPlacementBatch] = useState<{ index: number; total: number } | null>(
    null
  );
  const [plLayout, setPlLayout] = useState<ImagePlacementLayout>("full");
  const [plWidthPct, setPlWidthPct] = useState(100);
  const [plSpacing, setPlSpacing] = useState<"tight" | "normal" | "loose">("normal");
  const [plVertBias, setPlVertBias] = useState<"balanced" | "above" | "below">("balanced");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { class: "text-[#6b5344] underline" },
        },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      BackgroundColor,
      BlogImage.configure({ allowBase64: false }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    [placeholder]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: value || "",
      editorProps: {
        attributes: {
          class:
            "max-w-none focus:outline-none min-w-0 text-[#4a3f3a] [&_a]:text-[#6b5344] [&_a]:underline",
        },
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData("text/plain");
          if (text == null || text === "") return false;
          event.preventDefault();
          const { state } = view;
          const { from, to } = state.selection;
          view.dispatch(state.tr.insertText(text, from, to));
          return true;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChangeRef.current(normalizeEmptyHtml(ed.getHTML()));
      },
    },
    [extensions]
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = normalizeEmptyHtml(value || "");
    const current = normalizeEmptyHtml(editor.getHTML());
    if (incoming === current) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const exec = useCallback(
    (fn: () => boolean) => {
      if (!editor || editor.isDestroyed) return;
      fn();
    },
    [editor]
  );

  const stashToolbarSelection = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const sel = editor.state.selection;
    let from = sel.from;
    let to = sel.to;
    if (from === to && lastNonEmptyRangeRef.current != null) {
      const age = Date.now() - lastNonEmptyAtMsRef.current;
      if (age >= 0 && age < 1100) {
        from = lastNonEmptyRangeRef.current.from;
        to = lastNonEmptyRangeRef.current.to;
      }
    }
    toolbarSelectionRef.current = { from, to };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const onSel = () => {
      const s = editor.state.selection;
      if (!s.empty && s.from !== s.to) {
        lastNonEmptyRangeRef.current = { from: s.from, to: s.to };
        lastNonEmptyAtMsRef.current = Date.now();
      }
    };
    editor.on("selectionUpdate", onSel);
    return () => {
      editor.off("selectionUpdate", onSel);
    };
  }, [editor]);

  /** Restore stashed selection (if any), then run the chain builder. */
  const chainWithStashedSelection = useCallback(
    (build: (chain: ChainedCommands) => ChainedCommands) => {
      if (!editor || editor.isDestroyed) return false;
      const doc = editor.state.doc;
      const max = doc.content.size;
      let r = toolbarSelectionRef.current;

      if (r != null) {
        const from = Math.min(Math.max(r.from, 0), max);
        const to = Math.min(Math.max(r.to, from), max);
        r = from === to ? null : { from, to };
      }

      let chain = editor.chain().focus();
      if (r) {
        chain = chain.setTextSelection(r);
      }

      const ran = build(chain).run();
      toolbarSelectionRef.current = null;
      return ran;
    },
    [editor]
  );

  const updateFillPalettePosition = useCallback(() => {
    const el = fillPaletteContainerRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const panelWidth = 220;
    let left = r.left;
    const margin = 8;
    const maxLeft = window.innerWidth - panelWidth - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    setFillPalettePos({ top: r.bottom + margin, left });
  }, []);

  useLayoutEffect(() => {
    if (!fillPaletteOpen) return;
    updateFillPalettePosition();
  }, [fillPaletteOpen, updateFillPalettePosition]);

  useEffect(() => {
    if (!fillPaletteOpen || typeof window === "undefined") return;
    window.addEventListener("resize", updateFillPalettePosition);
    window.addEventListener("scroll", updateFillPalettePosition, true);
    return () => {
      window.removeEventListener("resize", updateFillPalettePosition);
      window.removeEventListener("scroll", updateFillPalettePosition, true);
    };
  }, [fillPaletteOpen, updateFillPalettePosition]);

  useEffect(() => {
    if (!fillPaletteOpen) return;
    function closeWhenOutside(ev: MouseEvent) {
      const trigger = fillPaletteContainerRef.current;
      const panel = fillPaletteDropdownRef.current;
      const t = ev.target as Node | null;
      if (!t) return;
      if (trigger?.contains(t)) return;
      if (panel?.contains(t)) return;
      setFillPaletteOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, [fillPaletteOpen]);

  const updateFontPalettePosition = useCallback(() => {
    const el = fontPaletteContainerRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const panelWidth = 220;
    let left = r.left;
    const margin = 8;
    const maxLeft = window.innerWidth - panelWidth - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    setFontPalettePos({ top: r.bottom + margin, left });
  }, []);

  useLayoutEffect(() => {
    if (!fontPaletteOpen) return;
    updateFontPalettePosition();
  }, [fontPaletteOpen, updateFontPalettePosition]);

  useEffect(() => {
    if (!fontPaletteOpen || typeof window === "undefined") return;
    window.addEventListener("resize", updateFontPalettePosition);
    window.addEventListener("scroll", updateFontPalettePosition, true);
    return () => {
      window.removeEventListener("resize", updateFontPalettePosition);
      window.removeEventListener("scroll", updateFontPalettePosition, true);
    };
  }, [fontPaletteOpen, updateFontPalettePosition]);

  useEffect(() => {
    if (!fontPaletteOpen) return;
    function closeWhenOutside(ev: MouseEvent) {
      const trigger = fontPaletteContainerRef.current;
      const panel = fontPaletteDropdownRef.current;
      const t = ev.target as Node | null;
      if (!t) return;
      if (trigger?.contains(t)) return;
      if (panel?.contains(t)) return;
      setFontPaletteOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, [fontPaletteOpen]);

  const cancelImagePlacement = useCallback(() => {
    pendingImageQueueRef.current = [];
    setPlacementBatch(null);
    setImagePlacementOpen(false);
    setPendingImageSrc(null);
  }, []);

  const openImagePlacementForSrc = useCallback(
    (
      src: string,
      resetLayout = true,
      batch: { index: number; total: number } | null = null
    ) => {
      setFillPaletteOpen(false);
      setFontPaletteOpen(false);
      setImageMenuOpen(false);
      setPendingImageSrc(src);
      setPlacementBatch(batch);
      if (resetLayout) {
        setPlLayout("full");
        setPlWidthPct(100);
        setPlSpacing("normal");
        setPlVertBias("balanced");
      }
      setImagePlacementOpen(true);
    },
    []
  );

  const confirmImagePlacement = useCallback(() => {
    if (!editor || editor.isDestroyed || !pendingImageSrc) return;
    const style = buildBlogImageStyle(plLayout, plWidthPct, plSpacing, plVertBias);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: { src: pendingImageSrc, style, alt: "" },
      })
      .run();
    const next = pendingImageQueueRef.current.shift();
    if (next) {
      setPendingImageSrc(next);
      setPlacementBatch((b) =>
        b && b.total > 1 ? { index: Math.min(b.index + 1, b.total), total: b.total } : b
      );
      setImagePlacementOpen(true);
    } else {
      pendingImageQueueRef.current = [];
      setPlacementBatch(null);
      setImagePlacementOpen(false);
      setPendingImageSrc(null);
    }
  }, [editor, pendingImageSrc, plLayout, plWidthPct, plSpacing, plVertBias]);

  useEffect(() => {
    if (!imagePlacementOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelImagePlacement();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagePlacementOpen, cancelImagePlacement]);

  const imagePlacementPreviewImgRef = useRef<HTMLImageElement | null>(null);
  useLayoutEffect(() => {
    if (!imagePlacementOpen) return;
    const el = imagePlacementPreviewImgRef.current;
    if (!el) return;
    el.setAttribute(
      "style",
      buildBlogImageStyle(plLayout, plWidthPct, plSpacing, plVertBias)
    );
  }, [imagePlacementOpen, plLayout, plWidthPct, plSpacing, plVertBias]);

  const uploadOneInlineImage = useCallback(async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/blog-posts/upload", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
      detail?: string;
    };
    if (!res.ok) {
      throw new Error(
        data.detail
          ? `${data.error ?? "Upload failed"}: ${data.detail}`
          : data.error || "Upload failed."
      );
    }
    if (!data.url) {
      throw new Error("Upload did not return an image URL.");
    }
    return data.url;
  }, []);

  const handleInlineImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (!files.length) return;
      setImageUploading(true);
      pendingImageQueueRef.current = [];
      setPlacementBatch(null);
      try {
        const urls: string[] = [];
        for (const file of files) {
          const url = await uploadOneInlineImage(file);
          urls.push(url);
        }
        if (!urls.length) return;
        const rest = urls.slice(1);
        pendingImageQueueRef.current = rest;
        const batch =
          urls.length > 1 ? { index: 1, total: urls.length } : null;
        openImagePlacementForSrc(urls[0]!, true, batch);
      } catch (err) {
        pendingImageQueueRef.current = [];
        setPlacementBatch(null);
        window.alert(
          err instanceof Error ? err.message : "Upload failed. Check your connection and try again."
        );
      } finally {
        setImageUploading(false);
      }
    },
    [openImagePlacementForSrc, uploadOneInlineImage]
  );

  const openImageFromUrlDialog = useCallback(() => {
    setImageMenuOpen(false);
    const raw = window.prompt(
      "Image URL — https:// or a path on this site (e.g. /uploads/blog/…)",
      "https://"
    );
    if (raw === null) return;
    const url = raw.trim();
    if (!url) return;
    if (!isAllowedInlineImageSrc(url)) {
      window.alert(
        "Use an https:// address or a path starting with / (for example an uploaded image on this site)."
      );
      return;
    }
    openImagePlacementForSrc(url, true, null);
  }, [openImagePlacementForSrc]);

  const updateImageMenuPosition = useCallback(() => {
    const el = imageMenuAnchorRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const panelWidth = 220;
    let left = r.left;
    const margin = 8;
    const maxLeft = window.innerWidth - panelWidth - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    setImageMenuPos({ top: r.bottom + margin, left });
  }, []);

  useLayoutEffect(() => {
    if (!imageMenuOpen) return;
    updateImageMenuPosition();
  }, [imageMenuOpen, updateImageMenuPosition]);

  useEffect(() => {
    if (!imageMenuOpen || typeof window === "undefined") return;
    window.addEventListener("resize", updateImageMenuPosition);
    window.addEventListener("scroll", updateImageMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateImageMenuPosition);
      window.removeEventListener("scroll", updateImageMenuPosition, true);
    };
  }, [imageMenuOpen, updateImageMenuPosition]);

  useEffect(() => {
    if (!imageMenuOpen) return;
    function closeWhenOutside(ev: MouseEvent) {
      const trigger = imageMenuAnchorRef.current;
      const panel = imageMenuPanelRef.current;
      const t = ev.target as Node | null;
      if (!t) return;
      if (trigger?.contains(t)) return;
      if (panel?.contains(t)) return;
      setImageMenuOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, [imageMenuOpen]);

  const surfaceOuter =
    surface === "canvas"
      ? "rounded-lg border border-[#e8b4a0]/80 bg-transparent flex min-h-0 flex-1 flex-col overflow-visible"
      : "rounded-lg border border-[#e8b4a0] bg-white overflow-visible";

  if (!editor) {
    return (
      <div
        className={`${surfaceOuter} p-4 ${className}`}
        style={{ minHeight }}
      >
        <p className="text-[#7a6b65]">Loading editor…</p>
      </div>
    );
  }

  const tbY = surface === "canvas" ? "py-0.5" : "py-1";

  return (
    <div data-tiptap-editor className={`${surfaceOuter} ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-1 border-b border-[#e8b4a0] bg-[#fdf2f0] ${
          surface === "canvas" ? "shrink-0 p-1.5" : "p-2"
        }`}
        onPointerDownCapture={stashToolbarSelection}
        onMouseDownCapture={(e) => {
          stashToolbarSelection();
          const el = e.target as HTMLElement | null;
          if (!el) return;
          if (el.closest("select")) return;
          if (el.closest('input[type="color"]')) return;
          if (el.closest('input[type="file"]')) return;
          e.preventDefault();
        }}
      >
        <div className="flex flex-wrap items-center gap-1">
          <span className="hidden text-[10px] font-semibold text-[#8b7355] sm:inline">
            Family
          </span>
          <select
            className={`rounded border border-[#e8b4a0] bg-white px-2 text-[#6b5344] ${
              surface === "canvas" ? "py-0.5 text-xs" : "py-1 text-sm"
            }`}
            onChange={(e) => {
              const v = e.target.value;
              exec(() =>
                v
                  ? editor.chain().focus().setFontFamily(v).run()
                  : editor.chain().focus().unsetFontFamily().run()
              );
            }}
            title="Font family — Serif, Sans, Monospace"
            defaultValue=""
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value || "default"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <select
          className={`rounded border border-[#e8b4a0] bg-white px-2 text-[#6b5344] ${
            surface === "canvas" ? "py-0.5 text-xs" : "py-1 text-sm"
          }`}
          onChange={(e) => {
            const v = e.target.value;
            exec(() =>
              v
                ? editor.chain().focus().setFontSize(v).run()
                : editor.chain().focus().unsetFontSize().run()
            );
          }}
          title="Text size"
          defaultValue=""
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleBold().run())}
          className={`rounded px-2 font-bold text-[#6b5344] hover:bg-white ${tbY} ${
            editor.isActive("bold") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleItalic().run())}
          className={`rounded px-2 italic text-[#6b5344] hover:bg-white ${tbY} ${
            editor.isActive("italic") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleUnderline().run())}
          className={`rounded px-2 text-[#6b5344] underline hover:bg-white ${tbY} ${
            editor.isActive("underline") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleStrike().run())}
          className={`rounded px-2 text-[#6b5344] line-through hover:bg-white ${tbY} ${
            editor.isActive("strike") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Strikethrough"
        >
          S
        </button>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleBulletList().run())}
          className={`rounded px-2 text-[#6b5344] hover:bg-white ${tbY} ${
            editor.isActive("bulletList") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleOrderedList().run())}
          className={`rounded px-2 text-[#6b5344] hover:bg-white ${tbY} ${
            editor.isActive("orderedList") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Numbered list"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href as string | undefined;
            stashToolbarSelection();
            const url = window.prompt(
              "Enter URL (https:// recommended):",
              previousUrl ?? "https://"
            );
            if (url === null) return;
            const trimmed = url.trim();
            if (trimmed === "") {
              exec(() =>
                chainWithStashedSelection((ch) => ch.unsetLink())
              );
              return;
            }
            let href = trimmed;
            if (!/^([a-z][a-z0-9+.-]*:|\/|\?|#|,|;)/i.test(href)) {
              href = `https://${href}`;
            }
            exec(() =>
              chainWithStashedSelection((ch) => ch.setLink({ href }))
            );
          }}
          className={`rounded px-2 text-[#6b5344] hover:bg-white ${tbY} ${
            editor.isActive("link") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Link — select text first, then set URL"
        >
          Link
        </button>
        <div className="relative" ref={imageMenuAnchorRef}>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleInlineImageFileChange}
          />
          <button
            type="button"
            disabled={imageUploading}
            className={`rounded px-2 text-[#6b5344] hover:bg-white disabled:cursor-wait disabled:opacity-60 ${tbY} ${
              surface === "canvas" ? "text-xs" : "text-sm"
            }`}
            title="Pictures inside the article (not the sheet backdrop) — upload or image URL, then choose layout."
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setFillPaletteOpen(false);
              setFontPaletteOpen(false);
              setImageMenuOpen((o) => !o);
            }}
          >
            {imageUploading ? "Upload…" : "Image ▼"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleBlockquote().run())}
          className={`rounded px-2 text-[#6b5344] hover:bg-white ${tbY} ${
            editor.isActive("blockquote") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Quote"
        >
          Quote
        </button>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        {/* Fill = preset swatches (▼) + current color bucket / custom */}
        <div className="flex items-center gap-0.5">
          <span className="hidden text-[10px] font-semibold text-[#8b7355] sm:inline">Fill</span>
          <div className="relative" ref={fillPaletteContainerRef}>
            <input
              ref={fillCustomColorInputRef}
              type="color"
              className="sr-only h-px w-px"
              tabIndex={-1}
              value={fillColor}
              onChange={(e) => {
                const v = e.target.value;
                setFillColor(v);
                exec(() =>
                  chainWithStashedSelection((ch) => ch.setBackgroundColor(v))
                );
              }}
            />
            <div className="inline-flex overflow-visible rounded border border-[#b8a99a] bg-white shadow-sm">
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[#4a3f3a] hover:bg-[#f5f0eb]"
                title="Apply current fill color to selection"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  exec(() =>
                    chainWithStashedSelection((ch) => ch.setBackgroundColor(fillColor))
                  )
                }
              >
                <IconFillColor className="text-[#5c4d42]" />
                <span
                  className="h-1.5 w-7 rounded-sm border border-[#d4c4b8]"
                  style={{ backgroundColor: fillColor }}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className={`flex cursor-pointer flex-col items-stretch justify-center border-l border-[#b8a99a] px-1 hover:bg-[#ebe4dc] ${
                  fillPaletteOpen ? "bg-[#ebe4dc]" : ""
                }`}
                title="Fill colors — choose a preset"
                aria-expanded={fillPaletteOpen}
                aria-haspopup="listbox"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFontPaletteOpen(false);
                  setImageMenuOpen(false);
                  setFillPaletteOpen((o) => !o);
                }}
              >
                <span className="px-0.5 text-[10px] leading-none font-semibold text-[#555] select-none">
                  Colors
                </span>
                <span className="px-0.5 text-[10px] leading-none text-[#666] select-none">▼</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            className="rounded border border-dashed border-[#b8a99a] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#6b5344] hover:bg-[#fff]"
            title="No fill — remove background from selection"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              exec(() =>
                chainWithStashedSelection((ch) =>
                  ch.unsetBackgroundColor().removeEmptyTextStyle()
                )
              )
            }
          >
            ∅
          </button>
        </div>
        {/* Text colour (foreground) — not font family */}
        <div className="flex items-center gap-0.5">
          <span className="hidden text-[10px] font-semibold text-[#8b7355] sm:inline">
            Text color
          </span>
          <div className="relative" ref={fontPaletteContainerRef}>
            <input
              ref={fontCustomColorInputRef}
              type="color"
              className="sr-only h-px w-px"
              tabIndex={-1}
              value={fontColor}
              onChange={(e) => {
                const v = e.target.value;
                setFontColor(v);
                exec(() => chainWithStashedSelection((ch) => ch.setColor(v)));
              }}
              aria-label="Custom font color"
            />
            <div className="inline-flex overflow-visible rounded border border-[#b8a99a] bg-white shadow-sm">
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 hover:bg-[#f5f0eb]"
                title="Apply current font color to selection"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  exec(() => chainWithStashedSelection((ch) => ch.setColor(fontColor)))
                }
              >
                <span className="text-lg font-bold leading-none" style={{ color: fontColor }}>
                  A
                </span>
                <span
                  className="h-1 w-7 rounded-sm border border-[#d4c4b8]"
                  style={{ backgroundColor: fontColor }}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className={`flex cursor-pointer flex-col items-stretch justify-center border-l border-[#b8a99a] px-1 hover:bg-[#ebe4dc] ${
                  fontPaletteOpen ? "bg-[#ebe4dc]" : ""
                }`}
                title="Text color — presets"
                aria-expanded={fontPaletteOpen}
                aria-haspopup="listbox"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFillPaletteOpen(false);
                  setImageMenuOpen(false);
                  setFontPaletteOpen((o) => !o);
                }}
              >
                <span className="px-0.5 text-[10px] leading-none font-semibold text-[#555] select-none">
                  Colors
                </span>
                <span className="px-0.5 text-[10px] leading-none text-[#666] select-none">▼</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            className="rounded border border-dashed border-[#b8a99a] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#6b5344] hover:bg-[#fff]"
            title="Automatic — default text color"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              exec(() =>
                chainWithStashedSelection((ch) => ch.unsetColor().removeEmptyTextStyle())
              )
            }
          >
            Auto
          </button>
        </div>
      </div>
      {surface === "canvas" ? (
        <div className="shrink-0 border-b border-[#e8b4a0] bg-[#faf7f5] px-2 py-1">
          <p className="text-[10px] leading-snug text-[#73655c]">
            <strong className="text-[#6b5344]">Image ▼</strong> = pictures in the article (not the backdrop above).
          </p>
        </div>
      ) : (
        <div className="border-b border-[#e8b4a0] bg-[#faf7f5] px-3 py-1.5">
          <p className="text-left text-[10px] font-normal leading-snug text-[#73655c]">
            <strong className="font-semibold text-[#6b5344]">In-article images:</strong> use{" "}
            <strong className="font-semibold text-[#6b5344]">Image ▼</strong>, then upload/link and pick placement
            (full width / float / center). This is independent of the optional{" "}
            <strong className="text-[#6b5344]">Article backdrop</strong> photo in the form above.
          </p>
        </div>
      )}
      <div
        style={{ minHeight }}
        className={
          surface === "canvas"
            ? "flex min-h-0 min-w-0 flex-1 flex-col bg-transparent [&_.ProseMirror]:min-h-full [&_.ProseMirror]:flex-1 [&_.ProseMirror]:bg-transparent [&_.ProseMirror]:outline-none"
            : "min-w-0 bg-[#fffdfb] [&_.ProseMirror]:min-h-full [&_.ProseMirror]:bg-[#fffdfb] [&_.ProseMirror]:outline-none"
        }
      >
        <EditorContent
          editor={editor}
          className={
            surface === "canvas"
              ? "tiptap-editor flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:flex-1 [&_.ProseMirror.is-editor-empty]:before:text-[#9ca3af] [&_.ProseMirror.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror.is-editor-empty]:before:float-left [&_.ProseMirror.is-editor-empty]:before:pointer-events-none [&_.ProseMirror.is-editor-empty]:before:h-0"
              : "tiptap-editor min-w-0 px-4 py-4 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror.is-editor-empty]:before:text-[#9ca3af] [&_.ProseMirror.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror.is-editor-empty]:before:float-left [&_.ProseMirror.is-editor-empty]:before:pointer-events-none [&_.ProseMirror.is-editor-empty]:before:h-0"
          }
        />
      </div>

      {typeof document !== "undefined" &&
        fillPaletteOpen &&
        createPortal(
          <div
            ref={fillPaletteDropdownRef}
            className="fixed z-[99999] w-[220px] rounded-lg border border-[#d4c4b8] bg-white py-2 shadow-xl"
            style={{
              top: fillPalettePos.top,
              left: fillPalettePos.left,
            }}
            role="listbox"
            aria-label="Fill color presets"
          >
            <p className="mb-2 border-b border-[#eee] px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
              Highlight colors
            </p>
            <div className="grid grid-cols-5 gap-1.5 px-2">
              {FILL_COLOR_PRESETS.map(({ hex, title }) => (
                <button
                  key={hex}
                  type="button"
                  role="option"
                  title={title}
                  aria-label={title}
                  className="h-7 w-full rounded border border-[#c4b8a8] hover:scale-105 hover:ring-2 hover:ring-[#8b7355]"
                  style={{ backgroundColor: hex }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFillColor(hex);
                    setFillPaletteOpen(false);
                    exec(() =>
                      chainWithStashedSelection((ch) => ch.setBackgroundColor(hex))
                    );
                  }}
                />
              ))}
            </div>
            <div className="mt-3 border-t border-[#eee] px-2 pt-2">
              <button
                type="button"
                className="w-full rounded border border-[#c4b8a8] bg-[#fdf2f0] py-2 text-xs font-semibold text-[#6b5344] hover:bg-[#f5ebe6]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFillPaletteOpen(false);
                  fillCustomColorInputRef.current?.click();
                }}
              >
                Custom color…
              </button>
              <p className="mt-2 text-[10px] leading-snug text-[#7a6b65]">
                Pick a preset, or Custom for the full picker. Bucket applies current color.
              </p>
            </div>
          </div>,
          document.body
        )}
      {typeof document !== "undefined" &&
        fontPaletteOpen &&
        createPortal(
          <div
            ref={fontPaletteDropdownRef}
            className="fixed z-[99999] w-[220px] rounded-lg border border-[#d4c4b8] bg-white py-2 shadow-xl"
            style={{
              top: fontPalettePos.top,
              left: fontPalettePos.left,
            }}
            role="listbox"
            aria-label="Text color presets"
          >
            <p className="mb-2 border-b border-[#eee] px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
              Text colors
            </p>
            <div className="grid grid-cols-5 gap-1.5 px-2">
              {FONT_COLOR_PRESETS.map(({ hex, title }) => (
                <button
                  key={hex}
                  type="button"
                  role="option"
                  title={title}
                  aria-label={title}
                  className="flex h-7 w-full items-center justify-center rounded border border-[#c4b8a8] bg-white hover:scale-105 hover:ring-2 hover:ring-[#8b7355]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFontColor(hex);
                    setFontPaletteOpen(false);
                    exec(() =>
                      chainWithStashedSelection((ch) => ch.setColor(hex))
                    );
                  }}
                >
                  <span className="text-sm font-bold leading-none" style={{ color: hex }}>
                    A
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-[#eee] px-2 pt-2">
              <button
                type="button"
                className="w-full rounded border border-[#c4b8a8] bg-[#fdf2f0] py-2 text-xs font-semibold text-[#6b5344] hover:bg-[#f5ebe6]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFontPaletteOpen(false);
                  fontCustomColorInputRef.current?.click();
                }}
              >
                Custom color…
              </button>
              <p className="mt-2 text-[10px] leading-snug text-[#7a6b65]">
                Tap a preset, or Custom for the full picker. “A” applies current color.
              </p>
            </div>
          </div>,
          document.body
        )}
      {typeof document !== "undefined" &&
        imageMenuOpen &&
        createPortal(
          <div
            ref={imageMenuPanelRef}
            className="fixed z-[99999] w-[220px] rounded-lg border border-[#d4c4b8] bg-white py-2 shadow-xl"
            style={{
              top: imageMenuPos.top,
              left: imageMenuPos.left,
            }}
            role="menu"
            aria-label="Insert image options"
          >
            <p className="border-b border-[#eee] px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
              Insert image
            </p>
            <div className="flex flex-col gap-1.5 px-2 pt-2">
              <button
                type="button"
                role="menuitem"
                className="rounded border border-[#c4b8a8] bg-white px-2 py-2 text-left text-xs font-semibold text-[#6b5344] hover:bg-[#fdf2f0]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setImageMenuOpen(false);
                  imageFileInputRef.current?.click();
                }}
              >
                Upload from computer…
                <span className="mt-0.5 block font-normal text-[#7a6b65]">
                  Multiple files OK — place each in turn.
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="rounded border border-[#c4b8a8] bg-[#fdf2f0] px-2 py-2 text-left text-xs font-semibold text-[#6b5344] hover:bg-[#f5ebe6]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openImageFromUrlDialog()}
              >
                Image from link…
              </button>
            </div>
            <p className="mt-2 px-2 text-[10px] leading-snug text-[#7a6b65]">
              Uploads use the same storage as the post header image (max 4 MB). A placement panel opens next: layout,
              width, spacing, and margins. These images live <strong className="font-semibold text-[#6b5344]">in the
              article body</strong>, not the optional sheet backdrop photo in the compose form.
            </p>
          </div>,
          document.body
        )}
      {typeof document !== "undefined" &&
        imagePlacementOpen &&
        pendingImageSrc &&
        createPortal(
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Place image"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) cancelImagePlacement();
            }}
          >
            <div
              className="flex max-h-[min(560px,calc(100vh-32px))] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#d4c4b8] bg-white shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-[#eee] px-4 py-3">
                <h2 className="text-sm font-bold text-[#4a3f3a]">
                  Place image
                  {placementBatch && placementBatch.total > 1 ? (
                    <span className="ml-1 font-normal text-[#6b5344]">
                      ({placementBatch.index} of {placementBatch.total})
                    </span>
                  ) : null}
                </h2>
                <p className="mt-0.5 text-[10px] leading-snug text-[#7a6b65]">
                  Choose how the picture sits on the row: centered block, full-width strip, floats for
                  text wrap, plus width and margins. Esc or backdrop cancels.
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <div className="rounded-lg border border-[#e8dccf] bg-[#faf7f5] p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
                    Preview
                  </p>
                  <div
                    className="rounded border border-dashed border-[#d4c4b8] bg-white p-2 text-[11px] leading-snug text-[#4a3f3a]"
                  >
                    {plLayout === "float-left" || plLayout === "float-right" ? (
                      <>
                        <span>
                          Wrap sample — Lorem ipsum dolor sit amet so you can judge text flow beside
                          the image.
                        </span>
                        <img
                          ref={imagePlacementPreviewImgRef}
                          src={pendingImageSrc}
                          alt=""
                          className="rounded-sm bg-[#f5ede6]"
                          draggable={false}
                        />
                        <span className="block pt-2">
                          More copy after the image clears.
                        </span>
                      </>
                    ) : (
                      <>
                        <p className="mb-2">Block images sit between paragraphs.</p>
                        <img
                          ref={imagePlacementPreviewImgRef}
                          src={pendingImageSrc}
                          alt=""
                          className="max-h-28 rounded-sm bg-[#f5ede6]"
                          draggable={false}
                        />
                        <p className="mt-2">Trailing paragraph spacing follows your margins.</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
                    Layout
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {IMAGE_LAYOUT_OPTIONS.map(({ id, label, hint }) => (
                      <button
                        key={id}
                        type="button"
                        title={hint}
                        className={`rounded border px-2 py-2 text-left text-[11px] font-semibold leading-tight transition-colors ${
                          plLayout === id
                            ? "border-[#8b7355] bg-[#fdf2f0] text-[#4a3f3a]"
                            : "border-[#c4b8a8] bg-white text-[#6b5344] hover:bg-[#faf7f5]"
                        }`}
                        onClick={() => setPlLayout(id)}
                      >
                        <span className="block">{label}</span>
                        <span className="mt-0.5 block font-normal normal-case tracking-normal text-[9px] text-[#8b7368]">
                          {hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
                    Max width
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {IMAGE_WIDTH_PRESETS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className={`min-w-[2.75rem] rounded border px-2 py-1.5 text-xs font-semibold ${
                          plWidthPct === pct
                            ? "border-[#8b7355] bg-[#fdf2f0] text-[#4a3f3a]"
                            : "border-[#c4b8a8] bg-white text-[#6b5344] hover:bg-[#faf7f5]"
                        }`}
                        onClick={() => setPlWidthPct(pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
                    Spacing vs text / floats
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: "tight", label: "Tight" },
                        { id: "normal", label: "Normal" },
                        { id: "loose", label: "Relaxed" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        className={`rounded border px-2 py-1.5 text-xs font-semibold ${
                          plSpacing === id
                            ? "border-[#8b7355] bg-[#fdf2f0] text-[#4a3f3a]"
                            : "border-[#c4b8a8] bg-white text-[#6b5344] hover:bg-[#faf7f5]"
                        }`}
                        onClick={() => setPlSpacing(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7355]">
                    Vertical margins
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: "balanced", label: "Balanced" },
                        { id: "above", label: "More above" },
                        { id: "below", label: "More below" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        className={`rounded border px-2 py-1.5 text-xs font-semibold ${
                          plVertBias === id
                            ? "border-[#8b7355] bg-[#fdf2f0] text-[#4a3f3a]"
                            : "border-[#c4b8a8] bg-white text-[#6b5344] hover:bg-[#faf7f5]"
                        }`}
                        onClick={() => setPlVertBias(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[#eee] bg-[#faf7f5] px-4 py-3">
                <button
                  type="button"
                  className="rounded border border-[#c4b8a8] bg-white px-3 py-2 text-xs font-semibold text-[#6b5344] hover:bg-[#f5ebe6]"
                  onClick={cancelImagePlacement}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded border border-[#8b7355] bg-[#fdf2f0] px-3 py-2 text-xs font-semibold text-[#4a3f3a] hover:bg-[#f5ebe6]"
                  onClick={confirmImagePlacement}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
