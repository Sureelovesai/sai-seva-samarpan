import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 300 * 1024;

function isRasterImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) return false;
  const path = parsed.pathname.toLowerCase();
  return !path.endsWith(".pdf");
}

async function toWhatsAppJpeg(input: Buffer) {
  const widths = [800, 640, 480];
  let quality = 62;
  let output = Buffer.alloc(0);

  for (const width of widths) {
    quality = 62;
    while (quality >= 40) {
      output = await sharp(input)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (output.length <= MAX_BYTES) return output;
      quality -= 8;
    }
  }

  return output;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.portalEvent.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { heroImageUrl: true, flyerUrl: true },
  });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const sourceUrl = [event.heroImageUrl, event.flyerUrl].find(isRasterImageUrl);
  if (!sourceUrl) return new NextResponse("No share image", { status: 404 });

  const imageResponse = await fetch(sourceUrl);
  if (!imageResponse.ok) return new NextResponse("Image unavailable", { status: 502 });

  const jpeg = await toWhatsAppJpeg(Buffer.from(await imageResponse.arrayBuffer()));

  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.length),
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
