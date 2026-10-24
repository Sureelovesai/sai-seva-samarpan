import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const FALLBACK_IMAGE = "/icons/icon-512x512.png";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3001";
}

function firstContentImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = match?.[1];
  // Data URIs can't be fetched by link-preview crawlers.
  if (!src || src.startsWith("data:")) return null;
  return src;
}

function plainTextExcerpt(html: string, maxLen = 200): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen).trim()}…` : text;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.blogPost
    .findUnique({
      where: { id },
      select: { title: true, content: true, imageUrl: true, status: true },
    })
    .catch(() => null);

  if (!post || post.status !== "APPROVED") return {};

  const origin = siteOrigin();
  const pageUrl = `${origin}/seva-blog/post/${id}`;
  const image = new URL(
    post.imageUrl || firstContentImage(post.content) || FALLBACK_IMAGE,
    origin
  ).toString();
  const description = plainTextExcerpt(post.content) || "A story from the Seva Blog.";

  return {
    title: `${post.title} | Seva Blog`,
    description,
    openGraph: {
      type: "article",
      url: pageUrl,
      siteName: "Sai Seva Portal",
      title: post.title,
      description,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default function PostPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
