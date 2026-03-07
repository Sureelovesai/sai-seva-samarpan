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
          onClick={() => exec("formatBlock", "blockquote")}
          className="rounded px-2 py-1 text-[#6b5344] hover:bg-white"
          title="Quote"
        >
          Quote
        </button>
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
