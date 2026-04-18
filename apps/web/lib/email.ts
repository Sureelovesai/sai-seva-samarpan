/**
 * Send email via Resend API.
 * To enable: set EMAIL_ENABLED=true and RESEND_API_KEY in .env.
 * To send to anyone (not just the Resend account owner): verify your domain in Resend
 * and set EMAIL_FROM to an address on that domain (e.g. "Seva <noreply@send.yourdomain.com>").
 * If EMAIL_FROM is unset, Resend uses onboarding@resend.dev and only delivers to the account owner.
 */
const RESEND_API = "https://api.resend.com/emails";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  /** Resend: base64-encoded file contents */
  attachments?: Array<{ filename: string; content: string }>;
};

function normalizeFrom(from: string): string {
  let s = from.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * From address for **portal events only** (/events — RSVP confirmations, organizer notices, 24h reminders).
 * Uses `EMAIL_FROM_EVENTS` if set; otherwise a Charlotte Sai Center `events@` address (not the global Seva `EMAIL_FROM`).
 * Verify the domain in Resend (e.g. charlottesaicenter.org).
 */
export function getPortalEventsEmailFrom(): string {
  const v = (process.env.EMAIL_FROM_EVENTS ?? "").trim();
  if (v) return normalizeFrom(v);
  return "Charlotte Sai Center Events <events@charlottesaicenter.org>";
}

/** Log once at first send so we know env is loaded (dev only). */
let _envLogged = false;
function logEnvOnce() {
  if (_envLogged || process.env.NODE_ENV === "production") return;
  _envLogged = true;
  const hasKey = !!process.env.RESEND_API_KEY?.trim();
  const from = (process.env.EMAIL_FROM ?? "").trim();
  console.log(
    "[email] env check: EMAIL_ENABLED=",
    process.env.EMAIL_ENABLED,
    "| RESEND_API_KEY=",
    hasKey ? "set" : "MISSING",
    "| EMAIL_FROM=",
    from ? `${from.slice(0, 20)}...` : "MISSING (will use default)"
  );
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const enabledRaw = process.env.EMAIL_ENABLED ?? "";
  const enabled = enabledRaw.trim().toLowerCase() === "true";
  if (!enabled) {
    console.warn("sendEmail skipped: EMAIL_ENABLED is not 'true' (got:", JSON.stringify(process.env.EMAIL_ENABLED), ")");
    return { ok: false, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("sendEmail skipped: RESEND_API_KEY not set or empty.");
    return { ok: false, skipped: true };
  }

  logEnvOnce();

  const rawFrom = options.from ?? process.env.EMAIL_FROM ?? "Seva <onboarding@resend.dev>";
  const from = normalizeFrom(rawFrom);
  if (!process.env.EMAIL_FROM && from.includes("onboarding@resend.dev")) {
    console.warn("EMAIL_FROM not set; sending from onboarding@resend.dev.");
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];
  const toClean = to.map((e) => (e && typeof e === "string" ? e.trim() : "")).filter(Boolean);
  if (toClean.length === 0) {
    return { ok: false, error: "No valid recipient" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("sendEmail: attempting to send to", toClean.length, "recipient(s), from:", from);
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
        to: toClean,
        subject: options.subject,
        html: options.html,
        ...(options.attachments?.length
          ? { attachments: options.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
          : {}),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string; name?: string; id?: string };
    if (!res.ok) {
      const err = data?.message ?? data?.name ?? `HTTP ${res.status}`;
      console.error(
        "Resend API error:",
        err,
        "| status:",
        res.status,
        "| from:",
        from,
        "| full body:",
        JSON.stringify(data)
      );
      return { ok: false, error: err };
    }
    if (process.env.NODE_ENV !== "production" && data?.id) {
      console.log("sendEmail: sent successfully, Resend id:", data.id);
    }
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("sendEmail error:", err);
    return { ok: false, error: err };
  }
}
