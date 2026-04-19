import { type BrandKit, fontCss } from "@/lib/brand/brand-kit";

interface BrandedEmailOptions {
  bodyHtml: string;
  caslFooter: string;
  openPixel?: string;
  brand: BrandKit;
}

/**
 * Wraps personalised email body with a brand header (logo + primary colour bar) and
 * the CASL-compliant footer. Used by both the immediate blast route and the
 * scheduled-send cron.
 */
export function buildBrandedEmail({ bodyHtml, caslFooter, openPixel = "", brand }: BrandedEmailOptions): string {
  const font = fontCss(brand.fontPrimary);
  const primary = brand.primaryColor || "#0A2342";

  const logoRow = brand.logoUrl
    ? `<tr>
        <td style="padding:16px 24px 0">
          <img src="${brand.logoUrl}" alt="${brand.campaignName}" style="max-height:60px;width:auto;display:block;" />
        </td>
       </tr>`
    : `<tr>
        <td style="padding:16px 24px 0;font-family:${font};font-size:18px;font-weight:700;color:#ffffff">
          ${brand.campaignName}
        </td>
       </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${font}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
          <!-- Brand header -->
          <tr>
            <td style="background:${primary};padding:0">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${logoRow}
                <tr><td style="height:12px"></td></tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 24px;font-family:${font};font-size:15px;line-height:1.6;color:#0f172a">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 28px">
              ${caslFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${openPixel}
</body>
</html>`;
}
