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
        startsAt: true,
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

  // Prefer HERO IMAGE for thumbnail, fallback to flyer
  const imageUrl = event.heroImageUrl || event.flyerUrl;

  const eventDate = new Date(event.startsAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    title: event.title,
    description: `${event.description}\n\nVenue: ${event.venue}\nDate: ${eventDate}`,
    openGraph: {
      type: "website",
      title: event.title,
      description: `${event.description}\n\nVenue: ${event.venue}`,
      url: `https://srisathyasaisevagcf.org/events/${city}/${id}`,
      images: imageUrl
        ? [
            {
              url: imageUrl,
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
      description: `${event.description}\n\nVenue: ${event.venue}`,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
