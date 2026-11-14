import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
    city: string;
  }>;
}

async function getEvent(eventId: string, city: string) {
  try {
    const cityName = decodeURIComponent(city).replace(/-/g, " ");
    const formattedCity = cityName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    const event = await prisma.portalEvent.findFirst({
      where: { id: eventId, status: "PUBLISHED", city: formattedCity },
      select: {
        id: true,
        title: true,
        description: true,
        venue: true,
        heroImageUrl: true,
        flyerUrl: true,
      },
    });
    return event;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, city } = await params;
  const event = await getEvent(id, city);

  if (!event) {
    return {
      title: "Event Not Found",
      description: "The event you are looking for could not be found.",
    };
  }

  // WhatsApp ignores preview images larger than about 300KB. The stored photo is
  // often several MB, so the share card points at a small JPEG we generate.
  const hasShareImage = [event.heroImageUrl, event.flyerUrl].some(
    (url) => Boolean(url) && !url!.toLowerCase().includes(".pdf")
  );
  const shareImageUrl = hasShareImage
    ? `https://srisathyasaisevagcf.org/api/portal-events/${id}/share-image.jpg`
    : undefined;

  const preview = `${event.description} Venue: ${event.venue}`.replace(/\s+/g, " ").trim();
  const shortPreview = preview.length > 220 ? `${preview.slice(0, 219).trimEnd()}…` : preview;

  return {
    title: event.title,
    description: shortPreview,
    openGraph: {
      type: "website",
      title: event.title,
      description: shortPreview,
      images: shareImageUrl
        ? [
            {
              url: shareImageUrl,
              secureUrl: shareImageUrl,
              type: "image/jpeg",
              width: 1200,
              height: 630,
              alt: event.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: shortPreview,
      images: shareImageUrl ? [shareImageUrl] : [],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
