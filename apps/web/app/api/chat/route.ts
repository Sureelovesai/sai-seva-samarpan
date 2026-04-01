import { NextResponse } from "next/server";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbot/systemPrompt";
import { fallbackReply } from "@/lib/chatbot/fallbackReply";
import { sanitizeHelpLinks, type HelpLink } from "@/lib/chatbot/validateLinks";

export const runtime = "nodejs";

const MAX_MESSAGES = 12;
const MAX_USER_CHARS = 2000;

type ChatMessage = { role: "user" | "assistant"; content: string };

const tools = [
  {
    type: "function" as const,
    function: {
      name: "suggest_links",
      description:
        "Provide validated in-app links as buttons. Call whenever you direct the user to a page, especially Find Seva with ?city=.",
      parameters: {
        type: "object",
        properties: {
          links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "Short button label" },
                path: {
                  type: "string",
                  description: "Internal path starting with /, e.g. /find-seva?city=Charlotte",
                },
              },
              required: ["label", "path"],
            },
          },
        },
        required: ["links"],
      },
    },
  },
];

async function openAiChat(messages: { role: string; content?: string | null; tool_calls?: unknown[] }[]): Promise<{
  message: string;
  links: HelpLink[];
}> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return fallbackReply(lastUser?.content || "");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.35,
      messages,
      tools,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI chat error:", res.status, errText.slice(0, 500));
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return fallbackReply(typeof lastUser?.content === "string" ? lastUser.content : "");
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
      };
    }>;
  };

  const choice = data.choices?.[0]?.message;
  let text = (choice?.content || "").trim();
  let links: HelpLink[] = [];

  const toolCalls = choice?.tool_calls;
  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls) {
      const name = tc?.function?.name;
      const rawArgs = tc?.function?.arguments;
      if (name !== "suggest_links" || typeof rawArgs !== "string") continue;
      try {
        const parsed = JSON.parse(rawArgs) as { links?: unknown };
        links = [...links, ...sanitizeHelpLinks(parsed?.links)];
      } catch {
        /* ignore malformed tool args */
      }
    }
  }

  if (!text && links.length > 0) {
    text = "Here are quick links for that:";
  }

  if (!text) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return fallbackReply(typeof lastUser?.content === "string" ? lastUser.content : "");
  }

  return { message: text, links };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMessages = body?.messages;
    if (!Array.isArray(rawMessages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const cleaned: ChatMessage[] = [];
    for (const m of rawMessages.slice(-MAX_MESSAGES)) {
      if (!m || typeof m !== "object") continue;
      const role = (m as { role?: string }).role;
      const content = (m as { content?: string }).content;
      if ((role === "user" || role === "assistant") && typeof content === "string") {
        const trimmed = content.slice(0, MAX_USER_CHARS).trim();
        if (trimmed) cleaned.push({ role, content: trimmed });
      }
    }

    if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }

    const apiMessages: { role: string; content: string }[] = [
      { role: "system", content: CHATBOT_SYSTEM_PROMPT },
      ...cleaned.map((m) => ({ role: m.role, content: m.content })),
    ];

    const { message, links } = await openAiChat(apiMessages);

    return NextResponse.json({ message, links });
  } catch (e: unknown) {
    console.error("POST /api/chat:", e);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
