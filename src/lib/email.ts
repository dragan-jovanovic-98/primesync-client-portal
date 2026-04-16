import sgMail from "@sendgrid/mail";
import { escapeHtml, wrapEmail } from "./email-layout";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@primesync.co";
const FROM_EMAIL = "portal@primesync.co";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

type PortalEmailOptions = {
  subject: string;
  category: string;
  message: string;
  client: {
    companyName: string;
    companyId: string;
    submitterName: string;
    submitterEmail: string;
  };
};

export async function sendPortalSupportEmail(options: PortalEmailOptions) {
  if (!SENDGRID_API_KEY) {
    console.warn("[email] SENDGRID_API_KEY not set, skipping email");
    return;
  }

  const { subject, category, message, client } = options;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 16px 6px 0;font-size:12px;color:#71717a;white-space:nowrap;vertical-align:top;text-transform:uppercase;letter-spacing:0.04em;">${label}</td>
      <td style="padding:6px 0;font-size:14px;color:#242529;">${value}</td>
    </tr>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">${escapeHtml(category)} request from ${escapeHtml(client.companyName)}.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 8px;">
      ${row("Company", escapeHtml(client.companyName))}
      ${row("Company ID", `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;">${escapeHtml(client.companyId)}</span>`)}
      ${row("Submitted by", `${escapeHtml(client.submitterName)} &lt;${escapeHtml(client.submitterEmail)}&gt;`)}
      ${row("Category", escapeHtml(category))}
    </table>
    <div style="margin-top:20px;padding:16px;background:#f8f9fa;border:1px solid #eeeff1;border-radius:8px;font-size:14px;color:#242529;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>`;

  const html = wrapEmail({
    preheader: `${category} request from ${client.companyName}`,
    heading: subject,
    bodyHtml,
    footerNote: `Reply to this email to respond directly to ${escapeHtml(client.submitterName)} at ${escapeHtml(client.submitterEmail)}.`,
  });

  await sgMail.send({
    to: SUPPORT_EMAIL,
    from: { email: FROM_EMAIL, name: "Primesync Portal" },
    replyTo: { email: client.submitterEmail, name: client.submitterName },
    subject: `[Portal] ${subject}`,
    html,
  });
}

type PortalInvitationEmailOptions = {
  to: string;
  fullName: string;
  setupLink: string;
  invitedByName: string;
  companyName: string;
};

export async function sendPortalInvitationEmail(
  options: PortalInvitationEmailOptions,
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn("[email] SENDGRID_API_KEY not set, skipping invitation email");
    return;
  }

  const { to, fullName, setupLink, invitedByName, companyName } = options;
  const greetingName = fullName?.trim() || "there";
  const safeCompany = escapeHtml(companyName);
  const safeInviter = escapeHtml(invitedByName);
  const safeGreeting = escapeHtml(greetingName);

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${safeGreeting},</p>
    <p style="margin:0;">
      ${safeInviter} invited you to access the Primesync client portal for <strong style="color:#242529;font-weight:600;">${safeCompany}</strong>. Set your password below to sign in and start reviewing your calls, performance, and billing in one place.
    </p>`;

  const html = wrapEmail({
    preheader: `${invitedByName} invited you to ${companyName} on Primesync`,
    heading: `You're invited to ${safeCompany} on Primesync`,
    bodyHtml,
    ctaLabel: "Set up your account",
    ctaUrl: setupLink,
    footerNote:
      "This invitation was sent from the Primesync client portal. If you weren't expecting it, you can safely ignore this email.",
  });

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: "Primesync Portal" },
    subject: `You're invited to ${companyName} on Primesync`,
    html,
  });
}
