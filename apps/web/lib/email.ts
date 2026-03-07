/**
 * Send email via Resend API.
 * To enable: set EMAIL_ENABLED=true and RESEND_API_KEY in .env (and verify domain in Resend for sending to others).
 * Parked: leave EMAIL_ENABLED unset or false to skip all sending.
 */
const RESEND_API = "https://api.resend.com/emails";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const enabled = process.env.EMAIL_ENABLED === "true";
  if (!enabled) {
    return { ok: false, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = options.from ?? process.env.EMAIL_FROM ?? "Seva <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping email.");
    return { ok: false, skipped: true };
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];
  if (to.length === 0 || !to.every((e) => e?.trim())) {
    return { ok: false, error: "No valid recipient" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data as { message?: string })?.message ?? `HTTP ${res.status}`;
      console.error("Resend API error:", err, data);
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("sendEmail error:", err);
    return { ok: false, error: err };
  }
}
