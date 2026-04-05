import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";
import { notifyReviewersProfileSubmitted } from "@/lib/communityOutreachNotify";

export const dynamic = "force-dynamic";

/** Optional HTTPS/HTTP URL or site-relative path (e.g. /uploads/...). */
function parseLogoUrl(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.length > 2048) return null;
  if (s.startsWith("/") && !s.startsWith("//")) {
    return s;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return s;
  } catch {
    return null;
  }
}

function displayName(u: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}): string {
  const a = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (a) return a;
  if (u.name?.trim()) return u.name.trim();
  return u.email;
}

/**
 * POST /api/community-outreach/profile
 * Submit or update organization profile (sets status to PENDING, notifies admins + regional coordinators).
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionWithRole(req.headers.get("cookie"));
    if (!session) {
      return NextResponse.json({ error: "Sign in to submit your organization profile." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const organizationName =
      typeof body.organizationName === "string" ? body.organizationName.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 8000) : "";
    const contactPhone =
      typeof body.contactPhone === "string" ? body.contactPhone.trim().slice(0, 40) : "";
    const website = typeof body.website === "string" ? body.website.trim().slice(0, 500) : "";
    const logoUrl = parseLogoUrl(body.logoUrl);
    if (body.logoUrl != null && body.logoUrl !== "" && logoUrl === null) {
      return NextResponse.json(
        { error: "Invalid organization image URL. Use https://… or a path starting with /." },
        { status: 400 }
      );
    }

    if (!organizationName) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }
    if (!city) {
      return NextResponse.json({ error: "City / center is required." }, { status: 400 });
    }

    const existing = await prisma.communityOutreachProfile.findUnique({
      where: { userId: session.sub },
    });
    if (existing?.status === "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Your organization profile is already approved. Use “Post a service activity” to list seva on Find Seva. Contact an admin if you need to change organization details.",
        },
        { status: 409 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { email: true, firstName: true, lastName: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const profile = await prisma.communityOutreachProfile.upsert({
      where: { userId: session.sub },
      create: {
        userId: session.sub,
        organizationName,
        logoUrl,
        description: description || null,
        city,
        contactPhone: contactPhone || null,
        website: website || null,
        status: "PENDING",
      },
      update: {
        organizationName,
        logoUrl,
        description: description || null,
        city,
        contactPhone: contactPhone || null,
        website: website || null,
        status: "PENDING",
        reviewedAt: null,
        reviewerNote: null,
      },
    });

    await notifyReviewersProfileSubmitted({
      organizationName: profile.organizationName,
      city: profile.city,
      submitterEmail: user.email,
      submitterName: displayName(user),
    });

    return NextResponse.json(profile);
  } catch (e: unknown) {
    console.error("community-outreach profile POST:", e);
    return NextResponse.json(
      { error: "Failed to save profile", detail: (e as Error)?.message },
      { status: 500 }
    );
  }
}
