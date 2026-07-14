// notify-lead — emails a notification for each new row in public.leads.
// Sends via Gmail SMTP (App Password). Invoked by an AFTER INSERT trigger on
// public.leads through pg_net; protected by a shared x-webhook-secret header.
// verify_jwt is disabled because this function implements its own auth (the
// shared secret) so the database trigger can call it without a Supabase JWT.
//
// Required secrets (Supabase → Edge Functions → Manage secrets):
//   GMAIL_APP_PASSWORD  — 16-char Google App Password for the sender account
//   WEBHOOK_SECRET      — must match the value in the on_lead_created trigger
// Optional (have sensible defaults baked in):
//   GMAIL_USER          — sender Gmail (default touchofferletter16@gmail.com)
//   NOTIFY_TO           — comma-separated recipients
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "touchofferletter16@gmail.com";
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const NOTIFY_TO = (Deno.env.get("NOTIFY_TO") ?? "me@sushantrana.com,touchofferletter16@gmail.com")
  .split(",").map((s) => s.trim()).filter(Boolean);

const esc = (v: unknown) =>
  String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Custom auth: the DB trigger sends this shared secret.
  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!GMAIL_APP_PASSWORD) {
    return new Response("Missing GMAIL_APP_PASSWORD secret", { status: 500 });
  }

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { /* ignore */ }
  const lead: Record<string, unknown> = (payload.record as Record<string, unknown>) ?? payload;

  const rows: [string, unknown][] = [
    ["Name", lead.full_name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Program", lead.course],
    ["Preferred contact", lead.contact_method],
    ["Message", lead.message],
    ["Form", lead.form_name],
    ["Page", lead.page_url],
    ["Submitted", lead.created_at ?? lead.submitted_at],
  ];

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1523">
    <h2 style="color:#0B1E4A;margin:0 0 12px">New lead — Touch Abroad</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows.map(([k, v]) => `<tr><td style="color:#80808C;vertical-align:top"><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join("")}
    </table>
    <p style="color:#80808C;font-size:12px;margin-top:16px">Reply to this email to respond directly to the lead.</p>
  </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v ?? "—"}`).join("\n");
  const subject = `New lead: ${lead.full_name ?? "Unknown"}${lead.course ? " — " + lead.course : ""}`;

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });

  try {
    await client.send({
      from: `Touch Abroad Leads <${GMAIL_USER}>`,
      to: NOTIFY_TO,
      replyTo: (typeof lead.email === "string" && lead.email) ? lead.email : undefined,
      subject,
      content: text,
      html,
    });
    await client.close();
    return new Response(JSON.stringify({ ok: true, sent_to: NOTIFY_TO }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    try { await client.close(); } catch { /* ignore */ }
    console.error("SMTP send failed:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
