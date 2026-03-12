import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 1;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Creates a reset token, stores it, and sends an email with the reset link.
 * Always returns 200 with a generic message to avoid email enumeration.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.trim?.()?.toLowerCase?.();

    if (!email) {
      return NextResponse.json(
        { ok: true, message: "If an account exists with this email, you will receive a password reset link." }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    // Don't reveal whether the email exists; always return success
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { ok: true, message: "If an account exists with this email, you will receive a password reset link." }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Defensive: client may be stale if generate was run while server was up
    const tokenDelegate = (prisma as { passwordResetToken?: { deleteMany: unknown } }).passwordResetToken;
    if (!tokenDelegate?.deleteMany) {
      return NextResponse.json(
        {
          error:
            "Password reset is not available. Restart the dev server: stop it and run `npm run dev` again from apps/web. If the issue persists, run `npx prisma generate --schema=./prisma/schema.prisma` then restart.",
        },
        { status: 503 }
      );
    }

    // Invalidate any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
        : null) ||
      (req.url ? new URL(req.url).origin : null) ||
      "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

    const emailResult = await sendEmail({
      to: email,
      subject: "Reset your password – Seva Samarpan",
      html: `
        <p>Hello,</p>
        <p>You requested a password reset for your Seva Samarpan account.</p>
        <p>Click the link below to set a new password (valid for ${TOKEN_EXPIRY_HOURS} hour):</p>
        <p><a href="${escapeHtml(resetUrl)}" style="color:#4f46e5;text-decoration:underline;">Reset password</a></p>
        <p>If you did not request this, you can ignore this email. Your password will not be changed.</p>
        <p>Jai Sai Ram.</p>
      `,
    });

    if (!emailResult.ok && !emailResult.skipped) {
      console.error("Forgot password: email send failed", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error("Forgot password error:", e);
    const msg = typeof err?.message === "string" ? err.message : String((e as Error)?.message ?? "");
    // Table missing = migration not run
    if (err?.code === "P2021" || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Password reset is not set up. Run in apps/web: npx prisma migrate deploy --schema=./prisma/schema.prisma then npx prisma generate --schema=./prisma/schema.prisma" },
        { status: 500 }
      );
    }
    // Prisma client missing model = generate not run
    if (msg.includes("passwordResetToken") || msg.includes("is not a function") || msg.includes("Cannot read property")) {
      return NextResponse.json(
        { error: "Password reset is not set up. Run in apps/web: npx prisma generate --schema=./prisma/schema.prisma and npx prisma migrate deploy --schema=./prisma/schema.prisma" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", detail: msg || undefined },
      { status: 500 }
    );
  }
}
