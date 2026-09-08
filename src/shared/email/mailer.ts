import "server-only";
import { env } from "@/shared/env";
import { publicEnv } from "@/shared/env.public";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  path: string;
  key: string;
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

/** Returns acceptance by Resend, not a promise of delivery to the inbox. */
export async function sendEmail(
  message: EmailMessage,
): Promise<{ id: string | null; error: string | null }> {
  if (env.EMAIL_DELIVERY === "disabled")
    return { id: null, error: "Email delivery is disabled." };
  if (!env.RESEND_API_KEY) return { id: null, error: "Email delivery is not configured." };
  const url = new URL(message.path, publicEnv.siteUrl);
  if (url.origin !== new URL(publicEnv.siteUrl).origin)
    return { id: null, error: "Invalid email destination." };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.key,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: `${message.body}\n\nOpen Campus Loop: ${url.href}\n\nManage message and deal emails in Settings. Please reply in the app.`,
        html: `<div style="background:#f5f1e8;padding:32px;font-family:Arial,sans-serif;color:#203d32"><div style="max-width:520px;margin:auto;background:#fffdf8;padding:32px;border:1px solid #ddd8cd"><p style="font-weight:800;letter-spacing:2px">CAMPUS LOOP</p><h1 style="font-size:26px">${escapeHtml(message.subject)}</h1><p style="line-height:1.7">${escapeHtml(message.body)}</p><a href="${escapeHtml(url.href)}" style="display:inline-block;background:#254b3b;color:white;padding:14px 20px;text-decoration:none">Open Campus Loop →</a><p style="font-size:12px;margin-top:32px;color:#615e56">Your campus. In circulation.<br>Manage message and deal emails in Settings. Please reply in the app.</p></div></div>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      return { id: null, error: `Resend rejected the request (HTTP ${response.status}).` };
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      typeof data.id === "string"
    )
      return { id: data.id, error: null };
    return { id: null, error: "Unexpected email provider response." };
  } catch {
    return { id: null, error: "Email provider unavailable. Retry with the same event key." };
  }
}
