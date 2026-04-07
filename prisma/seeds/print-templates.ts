// Seeds the PrintTemplate catalog with 15 campaign-ready templates.
// Usage: npm run db:seed:print-templates

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Seed {
  slug: string;
  name: string;
  category: string;
  width: number;
  height: number;
  bleed?: number;
  htmlTemplate: string;
  isPremium?: boolean;
  sortOrder?: number;
}

// Each template uses {{VAR}} tokens replaced by applyBrand().
// Designs are print-ready HTML rendered at 300dpi by the download route.

const CLASSIC_LAWN_SIGN = `<!doctype html><html><head><style>
    @page{size:24in 18in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};color:#fff;width:24in;height:18in;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:1in}
    .vote{font-size:48pt;letter-spacing:8pt;opacity:.85;margin:0}
    .name{font-size:144pt;font-weight:900;line-height:1;margin:.2in 0}
    .office{font-size:36pt;letter-spacing:4pt;opacity:.9}
    .corner{position:absolute;bottom:.5in;right:.5in;background:{{ACCENT_COLOR}};padding:.15in .4in;font-size:18pt;font-weight:700}
  </style></head><body>
    <p class="vote">VOTE</p>
    <h1 class="name">{{CANDIDATE_NAME}}</h1>
    <p class="office">{{TAGLINE}}</p>
    <div class="corner">{{WEBSITE}}</div>
  </body></html>`;

const DOOR_HANGER_ISSUE = `<!doctype html><html><head><style>
    @page{size:4.25in 11in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:4.25in;height:11in;display:flex;flex-direction:column}
    .hero{background:{{PRIMARY_COLOR}};color:#fff;padding:.4in;text-align:center}
    .name{font-size:28pt;font-weight:900;line-height:1.1;margin:.1in 0}
    .tagline{font-size:11pt;opacity:.9;margin:0}
    .issues{padding:.4in;flex:1}
    .issue{border-bottom:1pt solid #e2e8f0;padding:.15in 0;font-size:11pt}
    .cta{background:{{ACCENT_COLOR}};color:#fff;padding:.3in;text-align:center}
    .cta-title{font-size:14pt;font-weight:700;margin:0}
    .cta-web{font-size:10pt;margin:.1in 0 0}
  </style></head><body>
    <div class="hero">
      <p style="font-size:9pt;letter-spacing:3pt;margin:0">VOTE</p>
      <h1 class="name">{{CANDIDATE_NAME}}</h1>
      <p class="tagline">{{TAGLINE}}</p>
    </div>
    <div class="issues">
      <div class="issue">✓ Lower property taxes</div>
      <div class="issue">✓ Safer streets</div>
      <div class="issue">✓ Better transit</div>
      <div class="issue">✓ Affordable housing</div>
      <div class="issue">✓ Accountable council</div>
    </div>
    <div class="cta">
      <p class="cta-title">Election Day</p>
      <p class="cta-web">{{WEBSITE}}</p>
    </div>
  </body></html>`;

const FLYER_PLATFORM = `<!doctype html><html><head><style>
    @page{size:8.5in 11in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:8.5in;height:11in}
    .hero{background:{{PRIMARY_COLOR}};color:#fff;padding:.6in;text-align:center}
    .name{font-size:48pt;font-weight:900;margin:0;line-height:1}
    .tagline{font-size:14pt;opacity:.9;margin:.2in 0 0}
    .grid{padding:.5in;display:grid;grid-template-columns:1fr 1fr;gap:.3in}
    .card{border:2pt solid {{PRIMARY_COLOR}};padding:.25in;border-radius:.1in}
    .card h3{color:{{PRIMARY_COLOR}};margin:0 0 .1in;font-size:14pt}
    .card p{margin:0;font-size:10pt;color:#334155;line-height:1.4}
    .footer{background:{{ACCENT_COLOR}};color:#fff;padding:.3in;text-align:center;font-size:11pt}
  </style></head><body>
    <div class="hero">
      <h1 class="name">{{CANDIDATE_NAME}}</h1>
      <p class="tagline">{{TAGLINE}}</p>
    </div>
    <div class="grid">
      <div class="card"><h3>Lower taxes</h3><p>A responsible budget that respects taxpayers and delivers services.</p></div>
      <div class="card"><h3>Safer streets</h3><p>More frontline officers, better lighting, community policing.</p></div>
      <div class="card"><h3>Better transit</h3><p>Faster bus service, bike lanes, connected neighbourhoods.</p></div>
      <div class="card"><h3>Affordable housing</h3><p>Protect renters and get more homes built — starting now.</p></div>
    </div>
    <div class="footer">{{WEBSITE}} · {{PHONE}} · {{EMAIL}}</div>
  </body></html>`;

const PALM_CARD = `<!doctype html><html><head><style>
    @page{size:4in 6in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:4in;height:6in;background:{{PRIMARY_COLOR}};color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:.4in}
    .name{font-size:32pt;font-weight:900;line-height:1;margin:.2in 0}
    .badge{background:{{ACCENT_COLOR}};padding:.08in .3in;font-size:10pt;font-weight:700;letter-spacing:2pt}
    .tagline{font-size:11pt;opacity:.9;margin:.2in 0}
    .web{font-size:10pt;opacity:.8;margin-top:auto}
  </style></head><body>
    <div class="badge">VOTE</div>
    <h1 class="name">{{CANDIDATE_NAME}}</h1>
    <p class="tagline">{{TAGLINE}}</p>
    <p class="web">{{WEBSITE}}</p>
  </body></html>`;

const POSTCARD_GOTV = `<!doctype html><html><head><style>
    @page{size:6in 4in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:6in;height:4in;background:{{ACCENT_COLOR}};color:#0f172a;padding:.3in}
    .title{font-size:20pt;font-weight:900;margin:0;color:{{PRIMARY_COLOR}}}
    .msg{font-size:12pt;margin:.15in 0;line-height:1.3}
    .date{font-size:16pt;font-weight:700;background:{{PRIMARY_COLOR}};color:#fff;padding:.12in .3in;display:inline-block}
    .web{font-size:9pt;margin-top:.2in;opacity:.7}
  </style></head><body>
    <p class="title">ELECTION DAY IS HERE</p>
    <p class="msg">Polls are open from 10am to 8pm. Find your polling station online — bring ID.</p>
    <div class="date">VOTE {{CANDIDATE_NAME}}</div>
    <p class="web">{{WEBSITE}}</p>
  </body></html>`;

const BUTTON_2_25 = `<!doctype html><html><head><style>
    @page{size:2.25in 2.25in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:2.25in;height:2.25in;background:{{PRIMARY_COLOR}};color:#fff;border-radius:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
    .v{font-size:9pt;letter-spacing:3pt;opacity:.85}
    .n{font-size:22pt;font-weight:900;line-height:1;margin:.05in 0}
    .o{font-size:9pt;opacity:.8}
  </style></head><body>
    <p class="v">VOTE</p>
    <h1 class="n">{{CANDIDATE_NAME}}</h1>
    <p class="o">{{TAGLINE}}</p>
  </body></html>`;

const BUMPER_STICKER = `<!doctype html><html><head><style>
    @page{size:11in 3in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:11in;height:3in;background:{{PRIMARY_COLOR}};color:#fff;display:flex;align-items:center;justify-content:center;gap:.5in;padding:0 .4in}
    .vote{font-size:42pt;font-weight:700;letter-spacing:6pt;opacity:.85}
    .name{font-size:96pt;font-weight:900;line-height:1}
    .accent{background:{{ACCENT_COLOR}};color:{{PRIMARY_COLOR}};padding:.1in .3in;font-size:14pt;font-weight:700}
  </style></head><body>
    <span class="vote">VOTE</span>
    <span class="name">{{CANDIDATE_NAME}}</span>
  </body></html>`;

const YARD_STAKE_SIGN = `<!doctype html><html><head><style>
    @page{size:24in 36in;margin:0}
    body{margin:0;font-family:{{FONT_CSS}};width:24in;height:36in;background:{{PRIMARY_COLOR}};color:#fff;padding:1in;display:flex;flex-direction:column;justify-content:center;text-align:center}
    .name{font-size:200pt;font-weight:900;line-height:1;margin:0}
    .tagline{font-size:48pt;margin:.5in 0}
    .accent-bar{background:{{ACCENT_COLOR}};height:.5in;margin:.5in 0}
    .web{font-size:32pt;opacity:.85}
  </style></head><body>
    <h1 class="name">{{CANDIDATE_NAME}}</h1>
    <div class="accent-bar"></div>
    <p class="tagline">{{TAGLINE}}</p>
    <p class="web">{{WEBSITE}}</p>
  </body></html>`;

const SEEDS: Seed[] = [
  { slug: "lawn-sign-24x18", name: "Lawn Sign — Classic 24×18", category: "lawn-sign", width: 24, height: 18, htmlTemplate: CLASSIC_LAWN_SIGN, sortOrder: 10 },
  { slug: "yard-stake-24x36", name: "Yard Stake Sign 24×36", category: "lawn-sign", width: 24, height: 36, htmlTemplate: YARD_STAKE_SIGN, sortOrder: 20 },
  { slug: "door-hanger-issue", name: "Door Hanger — Issue Focus", category: "door-hanger", width: 4.25, height: 11, htmlTemplate: DOOR_HANGER_ISSUE, sortOrder: 30 },
  { slug: "flyer-platform", name: "Flyer 8.5×11 — Full Platform", category: "flyer", width: 8.5, height: 11, htmlTemplate: FLYER_PLATFORM, sortOrder: 40 },
  { slug: "palm-card-4x6", name: "Palm Card 4×6", category: "palm-card", width: 4, height: 6, htmlTemplate: PALM_CARD, sortOrder: 50 },
  { slug: "postcard-gotv", name: "Postcard — GOTV Reminder", category: "postcard", width: 6, height: 4, htmlTemplate: POSTCARD_GOTV, sortOrder: 60 },
  { slug: "button-2-25", name: "Button 2.25\"", category: "button", width: 2.25, height: 2.25, htmlTemplate: BUTTON_2_25, sortOrder: 70 },
  { slug: "bumper-sticker", name: "Bumper Sticker 11×3", category: "sticker", width: 11, height: 3, htmlTemplate: BUMPER_STICKER, sortOrder: 80 },
  { slug: "lawn-sign-18x24-modern", name: "Lawn Sign 18×24 Modern", category: "lawn-sign", width: 18, height: 24, htmlTemplate: CLASSIC_LAWN_SIGN, sortOrder: 15 },
  { slug: "door-hanger-survey", name: "Door Hanger — Survey", category: "door-hanger", width: 4.25, height: 11, htmlTemplate: DOOR_HANGER_ISSUE, sortOrder: 35 },
  { slug: "flyer-event", name: "Flyer 8.5×11 — Event", category: "flyer", width: 8.5, height: 11, htmlTemplate: FLYER_PLATFORM, sortOrder: 45 },
  { slug: "postcard-thank-you", name: "Postcard — Thank You", category: "postcard", width: 6, height: 4.25, htmlTemplate: POSTCARD_GOTV, sortOrder: 65 },
  { slug: "t-shirt", name: "T-Shirt", category: "shirt", width: 12, height: 16, htmlTemplate: PALM_CARD, isPremium: true, sortOrder: 90 },
  { slug: "tote-bag", name: "Tote Bag", category: "tote", width: 14, height: 16, htmlTemplate: PALM_CARD, isPremium: true, sortOrder: 100 },
  { slug: "window-cling", name: "Window Cling", category: "sticker", width: 8, height: 8, htmlTemplate: BUTTON_2_25, sortOrder: 110 },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const s of SEEDS) {
    const existing = await prisma.printTemplate.findUnique({ where: { slug: s.slug } });
    const data = {
      slug: s.slug,
      name: s.name,
      category: s.category,
      width: s.width,
      height: s.height,
      bleed: s.bleed ?? 0.125,
      htmlTemplate: s.htmlTemplate,
      isPremium: s.isPremium ?? false,
      isActive: true,
      sortOrder: s.sortOrder ?? 0,
    };
    if (existing) {
      await prisma.printTemplate.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.printTemplate.create({ data });
      created += 1;
    }
  }
  console.log(`Print templates: created=${created} updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
