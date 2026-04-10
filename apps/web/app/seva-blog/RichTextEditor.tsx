"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FONT_SIZES = [
  { value: "1", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "4", label: "Medium" },
  { value: "5", label: "Large" },
  { value: "6", label: "X-Large" },
  { value: "7", label: "Huge" },
];
const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Sans Serif", value: "Arial, sans-serif" },
  { label: "Monospace", value: "monospace" },
];

/** Text highlight / background (execCommand hiliteColor with styleWithCSS). */
const HIGHLIGHT_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#fff9c4", label: "Soft yellow" },
  { hex: "#c8e6c9", label: "Soft green" },
  { hex: "#bbdefb", label: "Soft blue" },
  { hex: "#f8bbd9", label: "Soft pink" },
  { hex: "#ffe0b2", label: "Soft peach" },
  { hex: "#e1bee7", label: "Soft lavender" },
  { hex: "#d7ccc8", label: "Soft taupe" },
];

function styleAttrMentionsBackground(styleAttr: string | null): boolean {
  if (!styleAttr) return false;
  return /background(?:-color)?\s*:/i.test(styleAttr);
}

function unwrapBareSpan(el: HTMLSpanElement): void {
  const hasClass = Boolean(el.className?.trim());
  const hasOtherAttrs = Array.from(el.attributes).some((a) => a.name !== "style");
  if (hasClass || hasOtherAttrs) return;
  if (el.style.cssText.trim()) return;
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/** Remove highlight spans the browser added (execCommand hiliteColor → span style background). */
function clearHighlightInEditor(editor: HTMLDivElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  let changed = false;

  if (range.collapsed) {
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== editor) {
      if (node instanceof HTMLElement) {
        if (node.tagName === "MARK") {
          const parent = node.parentNode;
          if (parent) {
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
            changed = true;
          }
          break;
        }
        const styleAttr = node.getAttribute("style");
        if (styleAttrMentionsBackground(styleAttr)) {
          node.style.removeProperty("background-color");
          node.style.removeProperty("background");
          if (!node.style.cssText.trim()) node.removeAttribute("style");
          changed = true;
          if (node instanceof HTMLSpanElement) unwrapBareSpan(node);
          break;
        }
      }
      node = (node as HTMLElement).parentElement;
    }
    return changed;
  }

  const candidates = editor.querySelectorAll<HTMLElement>("span, font, mark");
  candidates.forEach((el) => {
    try {
      if (!range.intersectsNode(el)) return;
    } catch {
      return;
    }
    if (el.tagName === "MARK") {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        changed = true;
      }
      return;
    }
    const styleAttr = el.getAttribute("style");
    if (!styleAttrMentionsBackground(styleAttr)) return;
    el.style.removeProperty("background-color");
    el.style.removeProperty("background");
    if (!el.style.cssText.trim()) el.removeAttribute("style");
    changed = true;
    if (el instanceof HTMLSpanElement) unwrapBareSpan(el);
  });

  return changed;
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
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const isInternalChange = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !editorRef.current || isInternalChange.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, mounted]);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    onChange(html === "<br>" ? "" : html);
    requestAnimationFrame(() => {
      isInternalChange.current = false;
    });
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value ?? undefined);
    editorRef.current?.focus();
    emitChange();
  }, [emitChange]);

  const applyTextBackgroundColor = useCallback(
    (hex: string) => {
      editorRef.current?.focus();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* some browsers omit this */
      }
      const applied = document.execCommand("hiliteColor", false, hex);
      if (!applied) {
        document.execCommand("backColor", false, hex);
      }
      emitChange();
    },
    [emitChange]
  );

  const clearTextBackground = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    // hiliteColor "transparent" is unreliable; remove inline background / unwrap <mark> instead.
    clearHighlightInEditor(editor);
    emitChange();
  }, [emitChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      emitChange();
    },
    [emitChange]
  );

  if (!mounted) {
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
      className={`overflow-hidden rounded-lg border border-[#e8b4a0] bg-white ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-[#e8b4a0] bg-[#fdf2f0] p-2">
        <select
          className="rounded border border-[#e8b4a0] bg-white px-2 py-1 text-sm text-[#6b5344]"
          onChange={(e) => exec("fontName", e.target.value || "Arial")}
          title="Font"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value || "default"} value={f.value || "Arial"}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-[#e8b4a0] bg-white px-2 py-1 text-sm text-[#6b5344]"
          onChange={(e) => exec("fontSize", e.target.value)}
          title="Size"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        <button
          type="button"
          onClick={() => exec("bold")}
          className="rounded px-2 py-1 font-bold text-[#6b5344] hover:bg-white"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="rounded px-2 py-1 italic text-[#6b5344] hover:bg-white"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="rounded px-2 py-1 text-[#6b5344] underline hover:bg-white"
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => exec("strikeThrough")}
          className="rounded px-2 py-1 text-[#6b5344] line-through hover:bg-white"
          title="Strikethrough"
        >
          S
        </button>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Numbered list"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) exec("createLink", url);
          }}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Link"
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            const raw = window.prompt(
              "Image URL (https:// only)",
              "https://"
            );
            const url = raw?.trim();
            if (!url || !/^https:\/\//i.test(url)) {
              if (raw?.trim()) window.alert("Please use an https:// image URL.");
              return;
            }
            const place = window.prompt(
              "Placement: type block (full width), left, right, or center",
              "block"
            )
              ?.trim()
              .toLowerCase();
            const mode = place === "left" || place === "right" || place === "center" ? place : "block";
            const styles: Record<string, string> = {
              block: "display:block;width:100%;max-width:100%;height:auto;margin:12px 0;",
              left: "float:left;max-width:42%;height:auto;margin:4px 14px 8px 0;",
              right: "float:right;max-width:42%;height:auto;margin:4px 0 8px 14px;",
              center: "display:block;margin:12px auto;max-width:90%;height:auto;",
            };
            const style = styles[mode] ?? styles.block;
            const safe = url.replace(/"/g, "&quot;");
            if (!editorRef.current) return;
            editorRef.current.focus();
            document.execCommand(
              "insertHTML",
              false,
              `<img src="${safe}" alt="" style="${style}" />`
            );
            emitChange();
          }}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Insert image — then choose wrap (left/right) or block"
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "blockquote")}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Quote"
        >
          Quote
        </button>
        <span className="mx-1 text-[#e8b4a0]">|</span>
        <span className="self-center text-xs font-semibold text-[#8b7355]">Highlight</span>
        <div className="flex flex-wrap items-center gap-0.5">
          {HIGHLIGHT_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              onClick={() => applyTextBackgroundColor(s.hex)}
              className="h-7 w-7 shrink-0 rounded border border-[#d4c4b8] shadow-sm ring-offset-1 hover:ring-2 hover:ring-[#8b6b5c]/40"
              style={{ backgroundColor: s.hex }}
              title={s.label}
              aria-label={`Highlight: ${s.label}`}
            />
          ))}
          <button
            type="button"
            onClick={clearTextBackground}
            className="ml-0.5 rounded border border-dashed border-[#b8a99a] bg-white px-2 py-1 text-[10px] font-semibold leading-none text-[#6b5344] hover:bg-[#fff]"
            title="Remove highlight: select highlighted text, or place the cursor inside it"
          >
            Clear
          </button>
        </div>
        <label className="ml-1 flex cursor-pointer items-center gap-1 text-xs text-[#6b5344]">
          <span className="hidden sm:inline">Custom</span>
          <input
            type="color"
            className="h-7 w-9 cursor-pointer rounded border border-[#e8b4a0] bg-white p-0"
            title="Custom highlight color"
            aria-label="Custom highlight color"
            defaultValue="#fff9c4"
            onChange={(e) => applyTextBackgroundColor(e.target.value)}
          />
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        data-placeholder={placeholder}
        className="min-w-0 p-4 text-[#4a3f3a] outline-none [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-[#9ca3af]"
        style={{ minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />
    </div>
  );
}
