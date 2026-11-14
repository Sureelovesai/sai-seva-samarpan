import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 300 * 1024;

function copyBytes(input: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(input.byteLength);
  copy.set(input as Uint8Array<ArrayBuffer>);
  return copy;
}

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

async function toWhatsAppJpeg(input: Uint8Array) {
  const source = copyBytes(input);
  let quality = 72;
  let output = new Uint8Array();

  while (quality >= 40) {
    const encoded = await sharp(source)
      .rotate()
      .resize({
        width: 1200,
        height: 630,
        fit: "contain",
        background: { r: 255, g: 247, b: 237 },
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    output = copyBytes(encoded);
    if (output.byteLength <= MAX_BYTES) return output;
    quality -= 8;
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

  const jpeg = await toWhatsAppJpeg(new Uint8Array(await imageResponse.arrayBuffer()));

  return new NextResponse(jpeg, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": 'inline; filename="share-image.jpg"',
      "Content-Length": String(jpeg.length),
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
