import { normalizeStoredDriveMedia } from "@/lib/blogDriveMedia";
import { htmlToPlain } from "@/lib/htmlToPlain";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export type PostForReport = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  driveMediaLinks: unknown;
  centerCity: string | null;
  createdAt: Date;
  section: string;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function openAiChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.45,
      max_tokens: 8192,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || "OpenAI request failed";
    throw new Error(msg);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty response from the AI model");
  return text.trim();
}

const MAX_POSTS = 60;
const BATCH = 5;

/**
 * Chunked summaries then a final narrative. Image URLs are passed as text;
 * only https URLs are described as externally viewable; relative paths are labeled as local.
 */
export async function generateBlogAnalyticsNarrative(
  posts: PostForReport[],
  targetWordCount: number,
  userInstructions: string
): Promise<string> {
  if (posts.length === 0) throw new Error("No posts to analyze");
  const slice = posts.length > MAX_POSTS ? posts.slice(0, MAX_POSTS) : posts;

  const batches = chunk(slice, BATCH);
  const batchSummaries: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const block = batch
      .map((p) => {
        const plain = htmlToPlain(p.content, 3500);
        const imgNote =
          p.imageUrl && /^https?:\/\//i.test(p.imageUrl.trim())
            ? p.imageUrl.trim()
            : p.imageUrl
              ? `[uploaded/local path: ${p.imageUrl} — infer only from text, not from pixels]`
              : "(no cover image)";
        const drive = normalizeStoredDriveMedia(p.driveMediaLinks);
        const driveNote =
          drive.length > 0
            ? `Extra media (R2) URLs (${drive.length}): ${drive.map((d) => d.url).join("; ")}`
            : "(no extra media links)";
        return `---\nTitle: ${p.title}\nSection: ${p.section}\nCenter: ${p.centerCity ?? "unspecified"}\nDate: ${p.createdAt.toISOString().slice(0, 10)}\nCover image: ${imgNote}\n${driveNote}\nBody (plain excerpt):\n${plain}\n`;
      })
      .join("\n");

    const summary = await openAiChat([
      {
        role: "system",
        content:
          "You summarize batches of seva blog posts for a regional analytics report. Output concise bullet notes: themes, types of seva, tone, and factual points from the text only. Do not invent visual details from images you cannot see.",
      },
      { role: "user", content: `Batch ${i + 1} of ${batches.length}:\n\n${block}` },
    ]);
    batchSummaries.push(summary);
  }

  const instructionBlock = userInstructions.trim()
    ? `Additional instructions from the requester:\n${userInstructions.trim()}\n\n`
    : "";

  const finalUser = `${instructionBlock}There are ${slice.length} approved blog posts total, analyzed in ${batches.length} batch(es). Below are batch-level notes.

Write ONE cohesive professional narrative report for leadership and volunteers (warm, respectful). Target length approximately ${targetWordCount} words (within about ±15%). Use only information supported by the notes. Do not cite internal batch numbers. Do not include post IDs.

Batch notes:

${batchSummaries.join("\n\n---\n\n")}`;

  return openAiChat([
    {
      role: "system",
      content: `You write seva blog analytics reports. Aim for roughly ${targetWordCount} words unless the source material is too thin—then say so briefly and write a shorter honest report.`,
    },
    { role: "user", content: finalUser },
  ]);
}
