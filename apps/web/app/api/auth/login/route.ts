import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, getCookieName } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.trim?.()?.toLowerCase?.();
    const password = body?.password;

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!password || typeof password !== "string") return NextResponse.json({ error: "Password is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    if (!verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const token = signToken({ sub: user.id, email: user.email });
    const cookieName = getCookieName();
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, name: user.name } });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (e: unknown) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Login failed", detail: (e as Error)?.message }, { status: 500 });
  }
}
