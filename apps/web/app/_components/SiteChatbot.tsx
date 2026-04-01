"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type HelpLink = { label: string; href: string };

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  links?: HelpLink[];
};

const QUICK_PROMPTS = [
  "How do I find seva in Charlotte?",
  "How do I join a seva activity?",
  "How do I withdraw from a signup?",
  "How does a seva coordinator add an activity?",
  "I can't see Seva Admin Dashboard or Add Seva",
  "How do I get my volunteer certificate?",
];

function renderInlineBold(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    const m = seg.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-semibold text-zinc-900">
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}

export function SiteChatbot() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatTurn[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (open) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      const t = window.setTimeout(() => inputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [open, messages, loading]);

  const send = useCallback(async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      const nextHistory: ChatTurn[] = [...messagesRef.current, { role: "user", content: trimmed }];
      setMessages(nextHistory);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Request failed");
        }
        const message = typeof data?.message === "string" ? data.message : "";
        const links = Array.isArray(data?.links) ? (data.links as HelpLink[]) : [];
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: message || "Here are some links that may help:",
            links: links.length ? links : undefined,
          },
        ]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry — I couldn’t reach the help service. Try again in a moment, or use **Find Seva** and **My Seva Dashboard** from the menu.",
            links: [
              { label: "Find Seva", href: "/find-seva" },
              { label: "My Seva Dashboard", href: "/dashboard" },
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
  }, [loading]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="print:hidden fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-700 text-white shadow-lg transition hover:bg-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        aria-label={open ? "Close help chat" : "Open help chat"}
      >
        {open ? (
          <span className="text-2xl leading-none" aria-hidden>
            ✕
          </span>
        ) : (
          <span className="sr-only">Help</span>
        )}
        {!open && (
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Help and navigation"
          className="print:hidden fixed bottom-24 right-5 z-[60] flex max-h-[min(560px,calc(100vh-7rem))] w-[min(100vw-2.5rem,400px)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        >
          <div className="border-b border-zinc-200 bg-gradient-to-r from-indigo-700 to-indigo-900 px-4 py-3">
            <p className="text-sm font-bold text-white">Seva portal help</p>
            <p className="mt-0.5 text-xs text-indigo-100">
              Answers about Find Seva, dashboard, roles, coordinators, certificates, and more.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Try one of these:</p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={loading}
                      onClick={() => send(p)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-left text-xs font-medium text-indigo-950 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="space-y-3">
              {messages.map((m, idx) => (
                <li key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      m.role === "user"
                        ? "ml-8 inline-block rounded-2xl rounded-br-md bg-indigo-100 px-3 py-2 text-left text-sm text-zinc-900"
                        : "mr-4 inline-block max-w-[95%] rounded-2xl rounded-bl-md bg-zinc-100 px-3 py-2 text-left text-sm text-zinc-800"
                    }
                  >
                    <div className="whitespace-pre-wrap">{renderInlineBold(m.content)}</div>
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5 border-t border-zinc-200/80 pt-2">
                        {m.links.map((l) => (
                          <Link
                            key={l.href + l.label}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-center text-xs font-semibold text-indigo-800 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {loading && (
              <p className="mt-3 text-xs text-zinc-500" aria-live="polite">
                Thinking…
              </p>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div ref={listEndRef} />
          </div>

          <form
            className="border-t border-zinc-200 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask how to use the portal…"
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                disabled={loading}
                maxLength={2000}
                aria-label="Message"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
