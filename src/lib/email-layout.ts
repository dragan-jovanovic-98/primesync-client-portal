import { BRAND } from "./brand";
import { getSiteUrl } from "./site-url";

type EmailLayoutOptions = {
  preheader?: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

const SUPPORT_EMAIL = BRAND.supportEmail;
const LOGO_URL = `${getSiteUrl()}${BRAND.emailLogoPath}`;

export function wrapEmail({
  preheader,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailLayoutOptions): string {
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f5f7;opacity:0;">${preheader}</div>`
    : "";

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `
        <tr>
          <td style="padding:28px 40px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#242529;border-radius:8px;">
                  <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;line-height:1;">
                    ${ctaLabel}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#71717a;line-height:1.6;">
            Or paste this link into your browser:
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#525866;line-height:1.5;word-break:break-all;">
            ${ctaUrl}
          </td>
        </tr>`
      : "";

  const footerNoteBlock = footerNote
    ? `
        <tr>
          <td style="padding:0 40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#a1a1aa;line-height:1.6;">
            ${footerNote}
          </td>
        </tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  ${preheaderBlock}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #eeeff1;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 40px 0;">
              <img src="${LOGO_URL}" alt="${BRAND.wordmark}" width="140" style="display:block;width:140px;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:600;color:#242529;letter-spacing:-0.01em;line-height:1.3;">
              ${heading}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#525866;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:8px 40px 0;">
              <div style="height:1px;background:#eeeff1;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          ${footerNoteBlock}
          <tr>
            <td style="padding:16px 40px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#a1a1aa;line-height:1.6;">
              Questions? Reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#525866;text-decoration:underline;">${SUPPORT_EMAIL}</a>.
            </td>
          </tr>
        </table>
        <div style="padding:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#a1a1aa;line-height:1.5;">
          ${BRAND.emailFooter}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
