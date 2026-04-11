// Seeds the PrintTemplate catalog with 15 campaign-ready templates.
// All templates use responsive CSS (vw/vh/clamp) so they render correctly
// in the live preview iframe AND include @page rules for print-ready output.
// Usage: npx ts-node --project tsconfig.json prisma/seeds/print-templates.ts

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

// ─── Template HTML ────────────────────────────────────────────────────────────
// All templates share these conventions:
//   - @page sets physical print dimensions
//   - html,body fill 100% so the preview iframe scales correctly
//   - Font sizes use clamp(min, vw/vh value, max)
//   - {{VAR}} tokens substituted by applyBrand() at preview/download time

// 1. Lawn Sign 24×18 — Classic Landscape
const LAWN_SIGN_24X18 = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:24in 18in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};display:flex;flex-direction:column}
  .top{height:6vh;background:{{SECONDARY_COLOR}};display:flex;align-items:center;padding:0 4vw;gap:2vw}
  .top-logo img{max-height:5vh;width:auto}
  .top-name{font-size:clamp(.6rem,2.2vh,1.4rem);font-weight:700;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.08em}
  .main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2vh 5vw}
  .vote{font-size:clamp(.7rem,3.5vh,2.2rem);letter-spacing:.6em;color:rgba(255,255,255,.75);text-transform:uppercase;margin-bottom:1.5vh}
  .name{font-size:clamp(3rem,14vh,10rem);font-weight:900;color:#fff;line-height:.88;letter-spacing:-.02em;text-transform:uppercase;text-shadow:0 2px 20px rgba(0,0,0,.25)}
  .tagline{font-size:clamp(.8rem,4vh,2.8rem);color:rgba(255,255,255,.85);margin-top:2.5vh;font-weight:400;letter-spacing:.04em}
  .bottom{height:9vh;background:{{SECONDARY_COLOR}};display:flex;align-items:center;justify-content:space-between;padding:0 5vw}
  .ward{font-size:clamp(.7rem,3vh,2rem);font-weight:700;color:{{PRIMARY_COLOR}};text-transform:uppercase}
  .web{font-size:clamp(.6rem,2.5vh,1.8rem);color:{{PRIMARY_COLOR}};font-weight:600}
</style></head><body>
  <div class="top"><div class="top-logo">{{LOGO_HTML}}</div><div class="top-name">{{CAMPAIGN_NAME}}</div></div>
  <div class="main"><div class="vote">Vote</div><div class="name">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div>
  <div class="bottom"><div class="ward">{{CAMPAIGN_NAME}}</div><div class="web">{{WEBSITE}}</div></div>
</body></html>`;

// 2. Lawn Sign 18×24 Modern — Bold Portrait with diagonal stripe
const LAWN_SIGN_18X24_MODERN = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:18in 24in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};position:relative;overflow:hidden}
  .stripe{position:absolute;bottom:0;right:0;width:55%;height:100%;background:{{SECONDARY_COLOR}};clip-path:polygon(18% 0%,100% 0%,100% 100%,0% 100%)}
  .content{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:5vh 6vw}
  .logo-wrap img{max-height:10vh;width:auto;filter:brightness(0) invert(1)}
  .name-block{margin-top:auto;margin-bottom:3vh}
  .vote-label{font-size:clamp(.6rem,2.5vw,1.8rem);letter-spacing:.5em;color:rgba(255,255,255,.7);text-transform:uppercase}
  .name{font-size:clamp(2rem,11vw,8rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.02em;text-shadow:0 3px 24px rgba(0,0,0,.35)}
  .tagline{font-size:clamp(.7rem,3.5vw,2.5rem);margin-top:2.5vh;color:rgba(255,255,255,.9);font-weight:300;letter-spacing:.06em}
  .footer{display:flex;justify-content:space-between;align-items:flex-end}
  .footer-web{font-size:clamp(.6rem,2.5vw,1.8rem);color:rgba(255,255,255,.75);font-weight:600}
  .footer-auth{font-size:clamp(.4rem,1.5vw,.9rem);color:rgba(255,255,255,.45);text-align:right;line-height:1.4}
</style></head><body>
  <div class="stripe"></div>
  <div class="content">
    <div class="logo-wrap">{{LOGO_HTML}}</div>
    <div class="name-block"><div class="vote-label">Vote</div><div class="name">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div>
    <div class="footer"><div class="footer-web">{{WEBSITE}}</div><div class="footer-auth">Authorised by<br>the official agent</div></div>
  </div>
</body></html>`;

// 3. Yard Stake Sign 24×36 — Dramatic tall portrait
const YARD_STAKE_24X36 = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:24in 36in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6vw}
  .logo-wrap{margin-bottom:4vh}.logo-wrap img{max-height:10vh;width:auto;filter:brightness(0) invert(1)}
  .name{font-size:clamp(4rem,16vw,14rem);font-weight:900;color:#fff;line-height:.85;text-transform:uppercase;letter-spacing:-.03em;text-shadow:0 4px 32px rgba(0,0,0,.3)}
  .stripe{width:100%;height:1.5vh;background:{{SECONDARY_COLOR}};margin:4vh 0;border-radius:1vh}
  .tagline{font-size:clamp(1rem,5vw,4rem);color:rgba(255,255,255,.88);font-weight:300;letter-spacing:.08em;text-transform:uppercase}
  .web{font-size:clamp(.7rem,3.5vw,2.8rem);color:rgba(255,255,255,.65);margin-top:3vh;font-weight:600}
</style></head><body>
  <div class="logo-wrap">{{LOGO_HTML}}</div>
  <div class="name">{{CANDIDATE_NAME}}</div>
  <div class="stripe"></div>
  <div class="tagline">{{TAGLINE}}</div>
  <div class="web">{{WEBSITE}}</div>
</body></html>`;

// 4. Door Hanger — Issue Focus
const DOOR_HANGER_ISSUE = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:4.25in 11in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};display:flex;flex-direction:column}
  .hero{background:{{PRIMARY_COLOR}};padding:5vh 6vw 4vh;display:flex;flex-direction:column;align-items:center;text-align:center}
  .logo-wrap img{max-height:9vh;width:auto;filter:brightness(0) invert(1);margin-bottom:2vh}
  .name{font-size:clamp(2rem,8vw,5rem);font-weight:900;color:#fff;line-height:.9;text-transform:uppercase;letter-spacing:-.02em}
  .tagline{font-size:clamp(.7rem,2.5vw,1.6rem);color:rgba(255,255,255,.82);margin-top:1.5vh}
  .accent{height:.8vh;background:{{SECONDARY_COLOR}}}
  .issues{flex:1;padding:4vw 6vw;background:#fff}
  .issues-title{font-size:clamp(.65rem,2.2vw,1.2rem);font-weight:800;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.08em;margin-bottom:2.5vh;border-bottom:2px solid {{SECONDARY_COLOR}};padding-bottom:1.5vh}
  .issue{display:flex;align-items:center;gap:2.5vw;padding:1.5vh 0;border-bottom:1px solid #f1f5f9}
  .dot{width:2.5vw;height:2.5vw;min-width:10px;min-height:10px;border-radius:50%;background:{{SECONDARY_COLOR}};flex-shrink:0}
  .issue-text{font-size:clamp(.65rem,2.2vw,1.25rem);color:#334155;line-height:1.3}
  .cta{background:{{PRIMARY_COLOR}};padding:3vh 6vw;text-align:center}
  .cta-name{font-size:clamp(.65rem,2.2vw,1.2rem);font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.06em}
  .cta-web{font-size:clamp(.6rem,1.8vw,1rem);color:rgba(255,255,255,.8);margin-top:1vh}
</style></head><body>
  <div class="hero"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="name">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div>
  <div class="accent"></div>
  <div class="issues">
    <div class="issues-title">My Priorities</div>
    <div class="issue"><div class="dot"></div><div class="issue-text">Lower property taxes &amp; responsible budgets</div></div>
    <div class="issue"><div class="dot"></div><div class="issue-text">Safer streets &amp; better lighting</div></div>
    <div class="issue"><div class="dot"></div><div class="issue-text">Improved transit &amp; infrastructure</div></div>
    <div class="issue"><div class="dot"></div><div class="issue-text">Affordable housing for all families</div></div>
    <div class="issue"><div class="dot"></div><div class="issue-text">Transparent, accountable city hall</div></div>
  </div>
  <div class="cta"><div class="cta-name">{{CANDIDATE_NAME}}</div><div class="cta-web">{{WEBSITE}} · {{PHONE}}</div></div>
</body></html>`;

// 5. Door Hanger — Conversation Starter (survey style)
const DOOR_HANGER_SURVEY = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:4.25in 11in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};display:flex;flex-direction:column;background:#fff}
  .hero{background:{{SECONDARY_COLOR}};padding:4vh 6vw 3vh;text-align:center}
  .eyebrow{font-size:clamp(.55rem,1.8vw,1rem);letter-spacing:.3em;color:{{PRIMARY_COLOR}};text-transform:uppercase;font-weight:700;opacity:.85}
  .title{font-size:clamp(1.4rem,5.5vw,3.2rem);font-weight:900;color:{{PRIMARY_COLOR}};line-height:.95;text-transform:uppercase;margin-top:1vh}
  .accent{height:.6vh;background:{{PRIMARY_COLOR}}}
  .intro{padding:2.5vh 6vw;background:#fff}
  .intro-text{font-size:clamp(.6rem,2vw,1.1rem);color:#475569;line-height:1.5}
  .intro-name{font-weight:700;color:{{PRIMARY_COLOR}}}
  .questions{flex:1;padding:0 6vw 2vh}
  .q-label{font-size:clamp(.55rem,1.8vw,.95rem);font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:1.5vh;margin-top:2.5vh}
  .q-item{display:flex;align-items:center;gap:2.5vw;padding:.8vh 0}
  .box{width:2.5vw;height:2.5vw;min-width:10px;min-height:10px;border:2px solid {{PRIMARY_COLOR}};border-radius:3px;flex-shrink:0}
  .q-text{font-size:clamp(.58rem,1.9vw,1.05rem);color:#334155}
  .footer{background:{{PRIMARY_COLOR}};padding:2.5vh 6vw;display:flex;justify-content:space-between;align-items:center}
  .footer-name{font-size:clamp(.6rem,2vw,1.1rem);font-weight:800;color:#fff;text-transform:uppercase}
  .footer-contact{font-size:clamp(.5rem,1.6vw,.9rem);color:rgba(255,255,255,.8);text-align:right;line-height:1.5}
</style></head><body>
  <div class="hero"><div class="eyebrow">Your Ward, Your Voice</div><div class="title">{{CANDIDATE_NAME}}</div></div>
  <div class="accent"></div>
  <div class="intro"><p class="intro-text">Hi — I'm <span class="intro-name">{{CANDIDATE_NAME}}</span>, and I'm running because this community deserves a council member who listens. What matters most to you?</p></div>
  <div class="questions">
    <div class="q-label">My top local priority is:</div>
    <div class="q-item"><div class="box"></div><div class="q-text">Roads &amp; infrastructure</div></div>
    <div class="q-item"><div class="box"></div><div class="q-text">Housing affordability</div></div>
    <div class="q-item"><div class="box"></div><div class="q-text">Public safety</div></div>
    <div class="q-item"><div class="box"></div><div class="q-text">Taxes &amp; city budget</div></div>
    <div class="q-item"><div class="box"></div><div class="q-text">Parks &amp; community services</div></div>
    <div class="q-label">Drop this at the door &amp; I'll follow up!</div>
  </div>
  <div class="footer"><div class="footer-name">{{CANDIDATE_NAME}}</div><div class="footer-contact"><div>{{WEBSITE}}</div><div>{{PHONE}}</div></div></div>
</body></html>`;

// 6. Flyer 8.5×11 — Full Platform
const FLYER_PLATFORM = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:8.5in 11in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};display:flex;flex-direction:column;background:#fff}
  .hero{background:linear-gradient(135deg,{{PRIMARY_COLOR}} 0%,{{SECONDARY_COLOR}} 100%);padding:5vh 6vw 4vh;position:relative;overflow:hidden}
  .hero::after{content:'';position:absolute;bottom:-3vh;right:-3vw;width:25vw;height:25vw;border-radius:50%;background:rgba(255,255,255,.07)}
  .logo-wrap img{max-height:8vh;width:auto;filter:brightness(0) invert(1);margin-bottom:2vh}
  .name{font-size:clamp(2.5rem,7vw,5.5rem);font-weight:900;color:#fff;line-height:.9;text-transform:uppercase;letter-spacing:-.02em}
  .tagline{font-size:clamp(.8rem,2.2vw,1.6rem);color:rgba(255,255,255,.88);margin-top:1.5vh;font-weight:300}
  .content{flex:1;padding:4vh 6vw;display:flex;flex-direction:column;gap:3.5vh}
  .section-title{font-size:clamp(.7rem,1.8vw,1.1rem);font-weight:800;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.08em;padding-bottom:1vh;border-bottom:2px solid {{SECONDARY_COLOR}}}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:2vw}
  .card{border:1.5px solid #e2e8f0;border-radius:1vw;padding:2vw}
  .card-head{font-size:clamp(.65rem,1.6vw,.95rem);font-weight:700;color:{{PRIMARY_COLOR}};margin-bottom:.8vh}
  .card-body{font-size:clamp(.6rem,1.4vw,.85rem);color:#64748b;line-height:1.5}
  .card-icon{font-size:clamp(.9rem,2.5vw,1.6rem);margin-bottom:1vh}
  .footer{background:{{PRIMARY_COLOR}};padding:2.5vh 6vw;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1vw}
  .footer-name{font-size:clamp(.7rem,1.8vw,1.1rem);font-weight:800;color:#fff;text-transform:uppercase}
  .footer-contact{font-size:clamp(.55rem,1.4vw,.85rem);color:rgba(255,255,255,.82);text-align:right;line-height:1.6}
</style></head><body>
  <div class="hero"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="name">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div>
  <div class="content">
    <div><div class="section-title">My Platform</div></div>
    <div class="cards">
      <div class="card"><div class="card-icon">🏘</div><div class="card-head">Affordable Housing</div><div class="card-body">Protect renters and get more homes built. Real action, not just talk.</div></div>
      <div class="card"><div class="card-icon">🛣</div><div class="card-head">Infrastructure</div><div class="card-body">Fix roads, improve transit, and maintain the services residents rely on.</div></div>
      <div class="card"><div class="card-icon">💰</div><div class="card-head">Fiscal Responsibility</div><div class="card-body">A budget that respects taxpayers and delivers value for every dollar.</div></div>
      <div class="card"><div class="card-icon">🛡</div><div class="card-head">Community Safety</div><div class="card-body">More frontline officers, better lighting, and community policing.</div></div>
    </div>
  </div>
  <div class="footer"><div class="footer-name">{{CANDIDATE_NAME}} · {{CAMPAIGN_NAME}}</div><div class="footer-contact"><div>{{WEBSITE}}</div><div>{{PHONE}} · {{EMAIL}}</div></div></div>
</body></html>`;

// 7. Flyer 8.5×11 — Event Announcement
const FLYER_EVENT = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:8.5in 11in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:#fff;display:flex;flex-direction:column}
  .topbar{height:1.5vh;background:{{PRIMARY_COLOR}}}
  .content{flex:1;padding:5vh 7vw;display:flex;flex-direction:column;gap:4vh}
  .eyebrow{font-size:clamp(.6rem,1.8vw,1.1rem);letter-spacing:.35em;color:{{SECONDARY_COLOR}};text-transform:uppercase;font-weight:700}
  .join-text{font-size:clamp(3rem,10vw,8rem);font-weight:900;color:{{PRIMARY_COLOR}};line-height:.88;text-transform:uppercase;letter-spacing:-.03em}
  .candidate-name{font-size:clamp(1.5rem,5vw,4rem);font-weight:700;color:#334155;line-height:1}
  .event-box{border:2.5px solid {{PRIMARY_COLOR}};border-radius:1.5vw;padding:3.5vh 5vw;display:flex;flex-direction:column;gap:2vh;background:{{PRIMARY_COLOR}}08}
  .event-row{display:flex;align-items:center;gap:3vw}
  .event-icon{font-size:clamp(.9rem,2.5vw,1.8rem);flex-shrink:0}
  .event-label{font-size:clamp(.55rem,1.5vw,.9rem);font-weight:700;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.06em}
  .event-value{font-size:clamp(.7rem,2vw,1.2rem);font-weight:600;color:#1e293b;margin-top:.3vh}
  .tagline{font-size:clamp(.75rem,2vw,1.3rem);color:#64748b;line-height:1.6;font-style:italic}
  .footer{background:{{PRIMARY_COLOR}};padding:2.5vh 7vw;display:flex;justify-content:space-between;align-items:center}
  .footer-logo img{max-height:6vh;width:auto;filter:brightness(0) invert(1)}
  .footer-contact{font-size:clamp(.6rem,1.5vw,.9rem);color:rgba(255,255,255,.85);text-align:right;line-height:1.6}
</style></head><body>
  <div class="topbar"></div>
  <div class="content">
    <div><div class="eyebrow">You're Invited</div><div class="join-text">Join</div><div class="candidate-name">{{CANDIDATE_NAME}}</div></div>
    <div class="event-box">
      <div class="event-row"><div class="event-icon">📅</div><div><div class="event-label">Date</div><div class="event-value">To be confirmed</div></div></div>
      <div class="event-row"><div class="event-icon">📍</div><div><div class="event-label">Location</div><div class="event-value">{{CAMPAIGN_NAME}} — details at {{WEBSITE}}</div></div></div>
      <div class="event-row"><div class="event-icon">🕖</div><div><div class="event-label">Time</div><div class="event-value">Doors open at 6:30 PM · Programme begins 7:00 PM</div></div></div>
    </div>
    <div class="tagline">"{{TAGLINE}}"<br>— {{CANDIDATE_NAME}}</div>
  </div>
  <div class="footer"><div class="footer-logo">{{LOGO_HTML}}</div><div class="footer-contact"><div>RSVP: {{WEBSITE}}</div><div>{{PHONE}}</div></div></div>
</body></html>`;

// 8. Palm Card 4×6 — Compact Carry Card
const PALM_CARD_4X6 = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:4in 6in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:5vw}
  .logo-wrap img{max-height:12vh;width:auto;filter:brightness(0) invert(1)}
  .mid{display:flex;flex-direction:column;align-items:center;text-align:center}
  .vote-badge{background:{{SECONDARY_COLOR}};color:{{PRIMARY_COLOR}};font-size:clamp(.5rem,2.5vw,1rem);font-weight:800;letter-spacing:.35em;text-transform:uppercase;padding:.5vh 3vw;border-radius:3vw;margin-bottom:2.5vh}
  .name{font-size:clamp(2.2rem,10vw,6rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.02em;text-shadow:0 2px 16px rgba(0,0,0,.25)}
  .tagline{font-size:clamp(.7rem,3vw,1.6rem);color:rgba(255,255,255,.85);margin-top:2.5vh;line-height:1.4;text-align:center}
  .footer{text-align:center}
  .web{font-size:clamp(.65rem,2.8vw,1.4rem);color:rgba(255,255,255,.7);font-weight:600}
  .auth{font-size:clamp(.4rem,1.6vw,.75rem);color:rgba(255,255,255,.45);margin-top:1.5vh;line-height:1.4}
</style></head><body>
  <div class="logo-wrap">{{LOGO_HTML}}</div>
  <div class="mid"><div class="vote-badge">Vote</div><div class="name">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div>
  <div class="footer"><div class="web">{{WEBSITE}}</div><div class="auth">Authorised by the official agent of {{CAMPAIGN_NAME}}</div></div>
</body></html>`;

// 9. Postcard 6×4 — GOTV Reminder (landscape)
const POSTCARD_GOTV = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:6in 4in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};display:grid;grid-template-columns:1fr 1fr;overflow:hidden}
  .left{display:flex;flex-direction:column;justify-content:space-between;padding:5vh 5vw}
  .logo-wrap img{max-height:10vh;width:auto;filter:brightness(0) invert(1)}
  .headline{font-size:clamp(1.8rem,6vw,4.5rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.02em}
  .headline span{color:{{SECONDARY_COLOR}}}
  .sub{font-size:clamp(.6rem,2vw,1.2rem);color:rgba(255,255,255,.8);margin-top:1.5vh;line-height:1.5}
  .right{background:{{SECONDARY_COLOR}};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:5vh 5vw;text-align:center;gap:3vh}
  .date-label{font-size:clamp(.6rem,1.8vw,1rem);font-weight:700;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.12em}
  .date{font-size:clamp(1.2rem,4vw,2.8rem);font-weight:900;color:{{PRIMARY_COLOR}};line-height:1}
  .divider{width:80%;height:2px;background:{{PRIMARY_COLOR}};opacity:.2}
  .candidate{font-size:clamp(.8rem,2.5vw,1.6rem);font-weight:800;color:{{PRIMARY_COLOR}};text-transform:uppercase}
  .web{font-size:clamp(.6rem,1.8vw,1rem);color:{{PRIMARY_COLOR}};opacity:.7;font-weight:600}
</style></head><body>
  <div class="left">
    <div class="logo-wrap">{{LOGO_HTML}}</div>
    <div><div class="headline">Election<br><span>Day</span><br>Is Here</div><div class="sub">Polls open 10am – 8pm. Bring ID. Find your polling station at elections.ca</div></div>
  </div>
  <div class="right">
    <div><div class="date-label">Vote for</div><div class="candidate">{{CANDIDATE_NAME}}</div></div>
    <div class="divider"></div>
    <div><div class="date-label">Election Day</div><div class="date">October 26, 2026</div></div>
    <div class="web">{{WEBSITE}}</div>
  </div>
</body></html>`;

// 10. Postcard 6×4.25 — Thank You (landscape)
const POSTCARD_THANKYOU = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:6in 4.25in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:#fff;display:flex;flex-direction:column}
  .topbar{height:1vh;background:{{PRIMARY_COLOR}}}
  .content{flex:1;display:grid;grid-template-columns:auto 1fr;gap:4vw;padding:5vh 6vw;align-items:center}
  .left{display:flex;flex-direction:column;align-items:flex-start;gap:2vh}
  .logo-wrap img{max-height:10vh;width:auto}
  .thank{font-size:clamp(2rem,7vw,5rem);font-weight:900;color:{{PRIMARY_COLOR}};line-height:.88;text-transform:uppercase;letter-spacing:-.02em}
  .right{display:flex;flex-direction:column;gap:2vh;padding-left:4vw;border-left:3px solid {{SECONDARY_COLOR}}}
  .msg{font-size:clamp(.7rem,2vw,1.2rem);color:#334155;line-height:1.6}
  .sig-name{font-size:clamp(.9rem,2.5vw,1.6rem);font-weight:800;color:{{PRIMARY_COLOR}};margin-top:1.5vh}
  .sig-title{font-size:clamp(.6rem,1.8vw,1rem);color:#64748b}
  .bottombar{height:6vh;background:{{PRIMARY_COLOR}};display:flex;align-items:center;justify-content:space-between;padding:0 6vw}
  .bar-text{font-size:clamp(.55rem,1.6vw,.9rem);color:rgba(255,255,255,.85);font-weight:600}
</style></head><body>
  <div class="topbar"></div>
  <div class="content">
    <div class="left"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="thank">Thank<br>You</div></div>
    <div class="right">
      <div class="msg">Your support means everything. Together we are building a stronger, more accountable {{CAMPAIGN_NAME}}. I am honoured to have your trust and your vote.</div>
      <div class="sig-name">{{CANDIDATE_NAME}}</div>
      <div class="sig-title">{{TAGLINE}}</div>
    </div>
  </div>
  <div class="bottombar"><div class="bar-text">{{WEBSITE}}</div><div class="bar-text">{{PHONE}}</div></div>
</body></html>`;

// 11. Button 2.25" — Campaign Pin
const BUTTON_2_25 = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:2.25in 2.25in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:50%;overflow:hidden;padding:8%}
  .vote{font-size:clamp(.4rem,3vw,1rem);letter-spacing:.4em;color:rgba(255,255,255,.7);text-transform:uppercase;margin-bottom:.8vh}
  .name{font-size:clamp(1rem,7vw,2.8rem);font-weight:900;color:#fff;line-height:.9;text-transform:uppercase;letter-spacing:-.02em}
  .stripe{width:80%;height:.5vh;background:{{SECONDARY_COLOR}};border-radius:.5vh;margin:1.5vh auto}
  .tagline{font-size:clamp(.3rem,2.2vw,.9rem);color:rgba(255,255,255,.8);line-height:1.3}
</style></head><body>
  <div class="vote">Vote</div>
  <div class="name">{{CANDIDATE_NAME}}</div>
  <div class="stripe"></div>
  <div class="tagline">{{TAGLINE}}</div>
</body></html>`;

// 12. Bumper Sticker 11×3 — Horizontal vinyl
const BUMPER_STICKER = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:11in 3in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};display:flex;align-items:center;padding:0 3vw;gap:3vw;overflow:hidden;position:relative}
  .accent-block{background:{{SECONDARY_COLOR}};width:1.5vw;height:80%;border-radius:.4vw;flex-shrink:0}
  .vote{font-size:clamp(1rem,4vh,2.8rem);font-weight:700;letter-spacing:.4em;color:rgba(255,255,255,.7);text-transform:uppercase;flex-shrink:0}
  .name{font-size:clamp(3rem,12vh,8rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.02em;flex:1;white-space:nowrap}
  .right{display:flex;flex-direction:column;align-items:flex-end;gap:1vh;flex-shrink:0}
  .tagline{font-size:clamp(.55rem,2vh,1.4rem);color:rgba(255,255,255,.8);text-align:right;line-height:1.3}
  .web{font-size:clamp(.5rem,1.8vh,1.2rem);color:rgba(255,255,255,.6);font-weight:600}
</style></head><body>
  <div class="accent-block"></div>
  <div class="vote">Vote</div>
  <div class="name">{{CANDIDATE_NAME}}</div>
  <div class="right"><div class="tagline">{{TAGLINE}}</div><div class="web">{{WEBSITE}}</div></div>
</body></html>`;

// 13. T-Shirt — Front Print Area 12×16
const T_SHIRT = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:12in 16in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8vw}
  .arc{font-size:clamp(.6rem,2.8vw,2rem);font-weight:700;letter-spacing:.55em;color:{{SECONDARY_COLOR}};text-transform:uppercase;margin-bottom:2vh}
  .name{font-size:clamp(3rem,12vw,9rem);font-weight:900;color:{{PRIMARY_COLOR}};line-height:.88;text-transform:uppercase;letter-spacing:-.02em}
  .stripe{width:90%;height:.6vh;background:{{SECONDARY_COLOR}};border-radius:.3vh;margin:3vh auto}
  .tagline{font-size:clamp(.8rem,3.5vw,2.5rem);color:#334155;font-weight:300;letter-spacing:.08em;text-transform:uppercase}
  .year{font-size:clamp(.6rem,2.5vw,1.8rem);color:{{PRIMARY_COLOR}};font-weight:700;margin-top:2.5vh;opacity:.7}
</style></head><body>
  <div class="arc">Vote</div>
  <div class="name">{{CANDIDATE_NAME}}</div>
  <div class="stripe"></div>
  <div class="tagline">{{TAGLINE}}</div>
  <div class="year">Municipal Election · 2026</div>
</body></html>`;

// 14. Tote Bag — Print Area 14×16
const TOTE_BAG = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:14in 16in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6vw;gap:3vh}
  .logo-wrap img{max-height:15vh;width:auto}
  .top-rule{width:60%;height:.4vh;background:{{PRIMARY_COLOR}};opacity:.2;border-radius:.2vh}
  .name{font-size:clamp(2rem,9vw,7rem);font-weight:900;color:{{PRIMARY_COLOR}};line-height:.88;text-transform:uppercase;letter-spacing:-.02em}
  .tagline{font-size:clamp(.7rem,3vw,2rem);color:{{SECONDARY_COLOR}};font-weight:600;letter-spacing:.06em;text-transform:uppercase}
  .bottom-rule{width:60%;height:.4vh;background:{{PRIMARY_COLOR}};opacity:.2;border-radius:.2vh}
  .web{font-size:clamp(.6rem,2.5vw,1.6rem);color:#64748b;font-weight:600}
</style></head><body>
  <div class="logo-wrap">{{LOGO_HTML}}</div>
  <div class="top-rule"></div>
  <div class="name">{{CANDIDATE_NAME}}</div>
  <div class="tagline">{{TAGLINE}}</div>
  <div class="bottom-rule"></div>
  <div class="web">{{WEBSITE}}</div>
</body></html>`;

// 15. Window Cling 8×8 — Square window sign
const WINDOW_CLING = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:8in 8in;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:{{FONT_CSS}};background:{{PRIMARY_COLOR}};position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6vw}
  .corner-accent{position:absolute;bottom:-5vw;right:-5vw;width:40vw;height:40vw;background:{{SECONDARY_COLOR}};border-radius:50%;opacity:.35}
  .corner-logo{position:absolute;top:4vw;right:4vw}
  .corner-logo img{max-height:8vh;width:auto;filter:brightness(0) invert(1);opacity:.75}
  .vote{font-size:clamp(.6rem,3vw,2rem);letter-spacing:.5em;color:rgba(255,255,255,.65);text-transform:uppercase;margin-bottom:2vh}
  .name{font-size:clamp(2rem,10vw,7rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.02em;text-shadow:0 3px 20px rgba(0,0,0,.3)}
  .stripe{width:70%;height:.8vh;background:{{SECONDARY_COLOR}};border-radius:.4vh;margin:3vh auto}
  .tagline{font-size:clamp(.7rem,3.5vw,2.2rem);color:rgba(255,255,255,.85);font-weight:300;letter-spacing:.05em}
  .web{font-size:clamp(.55rem,2.5vw,1.6rem);color:rgba(255,255,255,.6);margin-top:2.5vh;font-weight:600}
</style></head><body>
  <div class="corner-accent"></div>
  <div class="corner-logo">{{LOGO_HTML}}</div>
  <div class="vote">Vote</div>
  <div class="name">{{CANDIDATE_NAME}}</div>
  <div class="stripe"></div>
  <div class="tagline">{{TAGLINE}}</div>
  <div class="web">{{WEBSITE}}</div>
</body></html>`;

// ─── Seed catalog ─────────────────────────────────────────────────────────────

const SEEDS: Seed[] = [
  { slug: "lawn-sign-24x18",       name: "Lawn Sign — Classic 24×18",       category: "lawn-sign",   width: 24,   height: 18,   htmlTemplate: LAWN_SIGN_24X18,       sortOrder: 10 },
  { slug: "lawn-sign-18x24-modern",name: "Lawn Sign — Modern 18×24",        category: "lawn-sign",   width: 18,   height: 24,   htmlTemplate: LAWN_SIGN_18X24_MODERN, sortOrder: 15 },
  { slug: "yard-stake-24x36",      name: "Yard Stake Sign 24×36",           category: "lawn-sign",   width: 24,   height: 36,   htmlTemplate: YARD_STAKE_24X36,       sortOrder: 20 },
  { slug: "door-hanger-issue",     name: "Door Hanger — Issue Focus",       category: "door-hanger", width: 4.25, height: 11,   htmlTemplate: DOOR_HANGER_ISSUE,      sortOrder: 30 },
  { slug: "door-hanger-survey",    name: "Door Hanger — Survey",            category: "door-hanger", width: 4.25, height: 11,   htmlTemplate: DOOR_HANGER_SURVEY,     sortOrder: 35 },
  { slug: "flyer-platform",        name: "Flyer 8.5×11 — Full Platform",    category: "flyer",       width: 8.5,  height: 11,   htmlTemplate: FLYER_PLATFORM,         sortOrder: 40 },
  { slug: "flyer-event",           name: "Flyer 8.5×11 — Event",            category: "flyer",       width: 8.5,  height: 11,   htmlTemplate: FLYER_EVENT,            sortOrder: 45 },
  { slug: "palm-card-4x6",         name: "Palm Card 4×6",                   category: "palm-card",   width: 4,    height: 6,    htmlTemplate: PALM_CARD_4X6,          sortOrder: 50 },
  { slug: "postcard-gotv",         name: "Postcard — GOTV Reminder",        category: "postcard",    width: 6,    height: 4,    htmlTemplate: POSTCARD_GOTV,          sortOrder: 60 },
  { slug: "postcard-thank-you",    name: "Postcard — Thank You",            category: "postcard",    width: 6,    height: 4.25, htmlTemplate: POSTCARD_THANKYOU,      sortOrder: 65 },
  { slug: "button-2-25",           name: "Button 2.25\"",                   category: "button",      width: 2.25, height: 2.25, htmlTemplate: BUTTON_2_25,            sortOrder: 70 },
  { slug: "bumper-sticker",        name: "Bumper Sticker 11×3",             category: "sticker",     width: 11,   height: 3,    htmlTemplate: BUMPER_STICKER,         sortOrder: 80 },
  { slug: "t-shirt",               name: "T-Shirt Front Print",             category: "shirt",       width: 12,   height: 16,   htmlTemplate: T_SHIRT,                sortOrder: 90,  isPremium: true },
  { slug: "tote-bag",              name: "Tote Bag Print",                  category: "tote",        width: 14,   height: 16,   htmlTemplate: TOTE_BAG,               sortOrder: 100, isPremium: true },
  { slug: "window-cling",          name: "Window Cling 8×8",                category: "sticker",     width: 8,    height: 8,    htmlTemplate: WINDOW_CLING,           sortOrder: 110 },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  let created = 0;
  let updated = 0;

  for (const s of SEEDS) {
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

    const existing = await prisma.printTemplate.findUnique({ where: { slug: s.slug } });
    if (existing) {
      await prisma.printTemplate.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.printTemplate.create({ data });
      created++;
    }
  }

  console.log(`Print templates: created=${created} updated=${updated} (${SEEDS.length} total)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
