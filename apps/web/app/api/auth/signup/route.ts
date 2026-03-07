import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.trim?.()?.toLowerCase?.();
    const password = body?.password;
    const firstName = body?.firstName?.trim?.();
    const lastName = body?.lastName?.trim?.();
    const location = body?.location?.trim?.();
    const phone = body?.phone?.trim?.();

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!firstName) return NextResponse.json({ error: "First name is required" }, { status: 400 });
    if (!lastName) return NextResponse.json({ error: "Last name is required" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

    const passwordHash = hashPassword(password);
    const name = [firstName, lastName].filter(Boolean).join(" ");

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        name,
        location: location || null,
        phone: phone || null,
      },
    });

    return NextResponse.json({ ok: true, message: "Account created. Please log in." });
  } catch (e: unknown) {
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Failed to create account", detail: (e as Error)?.message }, { status: 500 });
  }
}
