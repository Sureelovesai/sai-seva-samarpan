import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/getRole";
import { canGenerateBlogReport } from "@/lib/blogReportAccess";

export const dynamic = "force-dynamic";

/**
 * GET /api/blog-reports/ready
 * Lets the report wizard show whether generation is likely to work (OpenAI key present).
 */
export async function GET(req: Request) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!canGenerateBlogReport(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return NextResponse.json({
    openaiConfigured,
    /** Hint for UI copy */
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  });
}
