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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your article…",
  className = "",
  minHeight = "200px",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}) {
  const onChangeRef = useRef(onChange);
  /**
   * Toolbar clicks blur the editor and clear the selection before onClick runs.
   * We stash selection on pointer capture, then restore it before applying marks.
   */
  const toolbarSelectionRef = useRef<{ from: number; to: number } | null>(null);

  /** Last chosen colors — Excel-style: main button applies these to the selection */
  const [fillColor, setFillColor] = useState("#fff9c4");
  const [fontColor, setFontColor] = useState("#4a3f3a");

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
    const { from, to } = editor.state.selection;
    toolbarSelectionRef.current = { from, to };
  }, [editor]);

  /** Restore stashed selection (if any), then run the chain builder. */
  const chainWithStashedSelection = useCallback(
    (build: (chain: ChainedCommands) => ChainedCommands) => {
      if (!editor || editor.isDestroyed) return false;
      const r = toolbarSelectionRef.current;
      let chain = editor.chain().focus();
      if (r) {
        chain = chain.setTextSelection(r);
      }
      return build(chain).run();
    },
    [editor]
  );

  if (!editor) {
    return (
      <div
        className={`rounded-lg border border-[#e8b4a0] bg-white p-4 ${className}`}
        style={{ minHeight }}
      >
        <p className="text-[#7a6b65]">Loading editor…</p>
      </div>
    );
  }

  return (
    <div
      data-tiptap-editor
      className={`overflow-hidden rounded-lg border border-[#e8b4a0] bg-white ${className}`}
    >
      <div
        className="flex flex-wrap items-center gap-1 border-b border-[#e8b4a0] bg-[#fdf2f0] p-2"
        onPointerDownCapture={stashToolbarSelection}
      >
        <select
          className="rounded border border-[#e8b4a0] bg-white px-2 py-1 text-sm text-[#6b5344]"
          onChange={(e) => {
            const v = e.target.value;
            exec(() =>
              v
                ? editor.chain().focus().setFontFamily(v).run()
                : editor.chain().focus().unsetFontFamily().run()
            );
          }}
          title="Font"
          defaultValue=""
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value || "default"} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-[#e8b4a0] bg-white px-2 py-1 text-sm text-[#6b5344]"
          onChange={(e) => {
            const v = e.target.value;
            exec(() =>
              v
                ? editor.chain().focus().setFontSize(v).run()
                : editor.chain().focus().unsetFontSize().run()
            );
          }}
          title="Size"
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
          className={`rounded px-2 py-1 font-bold text-[#6b5344] hover:bg-white ${
            editor.isActive("bold") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleItalic().run())}
          className={`rounded px-2 py-1 italic text-[#6b5344] hover:bg-white ${
            editor.isActive("italic") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleUnderline().run())}
          className={`rounded px-2 py-1 text-[#6b5344] underline hover:bg-white ${
            editor.isActive("underline") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleStrike().run())}
          className={`rounded px-2 py-1 text-[#6b5344] line-through hover:bg-white ${
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
          className={`rounded px-2 py-1 text-[#6b5344] hover:bg-white ${
            editor.isActive("bulletList") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleOrderedList().run())}
          className={`rounded px-2 py-1 text-[#6b5344] hover:bg-white ${
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
            const url = window.prompt("Enter URL:", previousUrl ?? "https://");
            if (url === null) return;
            const trimmed = url.trim();
            if (trimmed === "") {
              exec(() => editor.chain().focus().extendMarkRange("link").unsetLink().run());
              return;
            }
            exec(() => editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run());
          }}
          className={`rounded px-2 py-1 text-[#6b5344] hover:bg-white ${
            editor.isActive("link") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Link"
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            const raw = window.prompt("Image URL (https:// only)", "https://");
            const url = raw?.trim();
            if (!url || !/^https:\/\//i.test(url)) {
              if (raw?.trim()) window.alert("Please use an https:// image URL.");
              return;
            }
            const place = window
              .prompt("Placement: type block (full width), left, right, or center", "block")
              ?.trim()
              .toLowerCase();
            const mode =
              place === "left" || place === "right" || place === "center" ? place : "block";
            const styles: Record<string, string> = {
              block: "display:block;width:100%;max-width:100%;height:auto;margin:12px 0;",
              left: "float:left;max-width:42%;height:auto;margin:4px 14px 8px 0;",
              right: "float:right;max-width:42%;height:auto;margin:4px 0 8px 14px;",
              center: "display:block;margin:12px auto;max-width:90%;height:auto;",
            };
            const style = styles[mode] ?? styles.block;
            exec(() =>
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "image",
                  attrs: { src: url, style, alt: "" },
                })
                .run()
            );
          }}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Insert image — then choose wrap (left/right) or block"
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => exec(() => editor.chain().focus().toggleBlockquote().run())}
          className={`rounded px-2 py-1 text-[#6b5344] hover:bg-white ${
            editor.isActive("blockquote") ? "bg-white ring-1 ring-[#e8b4a0]" : ""
          }`}
          title="Quote"
        >
          Quote
        </button>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        {/* Excel-style Fill color (text background) */}
        <div className="flex items-center gap-0.5">
          <span className="hidden text-[10px] font-semibold text-[#8b7355] sm:inline">Fill</span>
          <div className="inline-flex overflow-hidden rounded border border-[#b8a99a] bg-white shadow-sm">
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[#4a3f3a] hover:bg-[#f5f0eb]"
              title="Fill color — select text first, or set color then type"
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
            <label
              className="flex cursor-pointer items-center border-l border-[#b8a99a] px-1 hover:bg-[#ebe4dc]"
              title="Choose fill color"
            >
              <input
                type="color"
                className="sr-only"
                value={fillColor}
                onChange={(e) => {
                  const v = e.target.value;
                  setFillColor(v);
                  exec(() =>
                    chainWithStashedSelection((ch) => ch.setBackgroundColor(v))
                  );
                }}
                aria-label="Fill color picker"
              />
              <span className="px-0.5 text-[10px] leading-none text-[#666] select-none">▼</span>
            </label>
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
        {/* Excel-style Font color */}
        <div className="flex items-center gap-0.5">
          <span className="hidden text-[10px] font-semibold text-[#8b7355] sm:inline">Font</span>
          <div className="inline-flex overflow-hidden rounded border border-[#b8a99a] bg-white shadow-sm">
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 hover:bg-[#f5f0eb]"
              title="Font color — select text first, or set color then type"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                exec(() => chainWithStashedSelection((ch) => ch.setColor(fontColor)))
              }
            >
              <span className="text-lg font-bold leading-none" style={{ color: fontColor }}>
                A
              </span>
              <span
                className="h-1 w-7 rounded-sm"
                style={{ backgroundColor: fontColor }}
                aria-hidden
              />
            </button>
            <label
              className="flex cursor-pointer items-center border-l border-[#b8a99a] px-1 hover:bg-[#ebe4dc]"
              title="Choose font color"
            >
              <input
                type="color"
                className="sr-only"
                value={fontColor}
                onChange={(e) => {
                  const v = e.target.value;
                  setFontColor(v);
                  exec(() => chainWithStashedSelection((ch) => ch.setColor(v)));
                }}
                aria-label="Font color picker"
              />
              <span className="px-0.5 text-[10px] leading-none text-[#666] select-none">▼</span>
            </label>
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
      <p className="border-b border-[#e8b4a0] bg-[#faf7f5] px-3 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[#a08070]">
        TipTap editor · ProseMirror
      </p>
      <div
        style={{ minHeight }}
        className="min-w-0 bg-[#fffdfb] [&_.ProseMirror]:min-h-full [&_.ProseMirror]:bg-[#fffdfb] [&_.ProseMirror]:outline-none"
      >
        <EditorContent
          editor={editor}
          className="tiptap-editor min-w-0 px-4 py-4 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror.is-editor-empty]:before:text-[#9ca3af] [&_.ProseMirror.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror.is-editor-empty]:before:float-left [&_.ProseMirror.is-editor-empty]:before:pointer-events-none [&_.ProseMirror.is-editor-empty]:before:h-0"
        />
      </div>
    </div>
  );
}
