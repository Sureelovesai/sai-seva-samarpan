import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 * Validates the token, updates the user's password, and deletes the token.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body?.token?.trim?.();
    const password = body?.password;

    if (!token) {
      return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
    }
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: record.email },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, updatedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({ where: { email: record.email } }),
    ]);

    return NextResponse.json({ ok: true, message: "Your password has been reset. You can now log in." });
  } catch (e: unknown) {
    console.error("Reset password error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
