import sgMail from "@sendgrid/mail";

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

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px;">
      <h2 style="font-size: 18px; color: #242529; margin-bottom: 4px;">${subject}</h2>
      <p style="font-size: 13px; color: #71717a; margin-top: 0;">Portal support request</p>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />

      <table style="font-size: 14px; color: #242529; border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #71717a; white-space: nowrap; vertical-align: top;">Company</td>
          <td style="padding: 6px 0; font-weight: 500;">${client.companyName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #71717a; white-space: nowrap; vertical-align: top;">Company ID</td>
          <td style="padding: 6px 0; font-family: monospace; font-size: 13px;">${client.companyId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #71717a; white-space: nowrap; vertical-align: top;">Submitted by</td>
          <td style="padding: 6px 0;">${client.submitterName} &lt;${client.submitterEmail}&gt;</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #71717a; white-space: nowrap; vertical-align: top;">Category</td>
          <td style="padding: 6px 0;">${category}</td>
        </tr>
      </table>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />

      <div style="font-size: 14px; color: #242529; line-height: 1.6; white-space: pre-wrap;">${message}</div>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />

      <p style="font-size: 12px; color: #a1a1aa;">
        Sent from the Primesync Client Portal on behalf of ${client.companyName}.
        Reply to this email to respond directly to ${client.submitterEmail}.
      </p>
    </div>
  `;

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

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; padding: 24px; color: #242529;">
      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">You're invited to ${companyName}'s Primesync portal</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #525866; margin: 0 0 20px;">
        Hi ${greetingName}, ${invitedByName} invited you to access the Primesync client portal for ${companyName}. Click the button below to set your password and sign in.
      </p>

      <p style="margin: 24px 0;">
        <a
          href="${setupLink}"
          style="display: inline-block; background: #242529; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;"
        >
          Set up your account
        </a>
      </p>

      <p style="font-size: 13px; line-height: 1.6; color: #71717a; margin: 0 0 8px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #525866; word-break: break-all; margin: 0 0 24px;">
        ${setupLink}
      </p>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />

      <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
        This invitation was sent from the Primesync client portal. If you weren't expecting it, you can safely ignore this email.
      </p>
    </div>
  `;

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: "Primesync Portal" },
    subject: `You're invited to ${companyName} on Primesync`,
    html,
  });
}
