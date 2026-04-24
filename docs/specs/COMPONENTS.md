# COMPONENTS.md — Poll City Component Library

> Extracted from src/components/ as of April 15, 2026.
> This is a Next.js 14 project. There are no Figma Make prototype components here.
> For page-level components, see the *-client.tsx files listed in ROUTES.md.

---

## Layout — src/components/layout/

| Component | Purpose |
|---|---|
| sidebar.tsx | Main app sidebar — role-aware, 6 sections + Operator Centre for SUPER_ADMIN |
| topbar.tsx | Top bar — campaign selector, search, notifications, user avatar |
| campaign-switcher.tsx | Dropdown to switch between campaigns |
| mobile-nav.tsx | Mobile navigation drawer |
| mobile-bottom-nav.tsx | Bottom nav bar for mobile |
| public-nav.tsx | Navigation for public-facing pages |

**Sidebar sections** (from sidebar.tsx):
- HEADQUARTERS, FIELD OPERATIONS, FINANCE, COMMUNICATIONS, ANALYTICS & INTEL, SETTINGS & ADMIN
- OPERATOR CENTRE (SUPER_ADMIN only — prepended at top)
- CANVASSER view (simplified: My Turf, My Tasks, Ask Adoni)
- FINANCE view (simplified: finance suite only)

---

## Adoni AI — src/components/adoni/

| Component | Purpose |
|---|---|
| adoni-chat.tsx | Main chat drawer — **PROTECTED**, contains the `pollcity:open-adoni` event listener |
| adoni-page-assist.tsx | Contextual page-level assist widget |

**Adoni rules:**
- Male (he/him), always
- No markdown, no bullets, no headers in responses
- Max 8 sentences, Canadian English
- Opens via: `window.dispatchEvent(new CustomEvent("pollcity:open-adoni", { detail: { prefill } }))`
- Do NOT add a second listener anywhere

---

## AI — src/components/ai/

| Component | Purpose |
|---|---|
| adoni.tsx | Adoni AI core component |

---

## App Shell — src/components/

| Component | Purpose |
|---|---|
| app-shell-client.tsx | Authenticated app shell wrapper |
| error-boundary.tsx | React error boundary |
| feature-gate.tsx | Feature flag gate component |
| global-search.tsx | Global Ctrl+K search |
| keyboard-shortcuts-modal.tsx | Keyboard shortcuts reference |
| poll-city-components.tsx | Shared component barrel |

---

## Canvassing — src/components/canvassing/

| Component | Purpose |
|---|---|
| address-lookup.tsx | Address autocomplete + geocoding |
| canvass-contact-card.tsx | Contact card shown at the door |
| household-walk-list.tsx | Household-grouped walk list view |
| quick-capture.tsx | Quick contact capture at the door |
| walk-list-view.tsx | Walk list rendering |

---

## Contacts — src/components/contacts/

| Component | Purpose |
|---|---|
| contact-slideover.tsx | Contact detail side panel |
| custom-field-renderer.tsx | Renders campaign-defined custom fields |

---

## Dashboard — src/components/dashboard/

| Component | Purpose |
|---|---|
| animated-number.tsx | Animated stat counter |
| dashboard-studio.tsx | Dashboard widget builder |
| live-insight-map.tsx | Live map with contact/activity overlay |
| stage-banner.tsx | Campaign stage progress banner |

---

## GOTV — src/components/gotv/

| Component | Purpose |
|---|---|
| gotv-engine.tsx | GOTV automation engine |
| gotv-war-room.tsx | War room main component |
| war-room-map.tsx | Live poll-by-poll map |
| war-room-sections.tsx | War room tab sections |
| candidate-call-list.tsx | Candidate call prioritisation list |

---

## Maps — src/components/maps/

| Component | Purpose |
|---|---|
| campaign-map.tsx | Leaflet campaign map (contacts, turf, signs) |
| turf-map.tsx | Turf assignment map with draw tools |

Both maps require dynamic import with `ssr: false` (Leaflet is browser-only).

---

## Onboarding — src/components/onboarding/

| Component | Purpose |
|---|---|
| setup-wizard.tsx | Campaign setup wizard (multi-step) |
| setup-wizard-gate.tsx | Gate — shows wizard on first login |
| campaign-tour.tsx | Interactive feature tour |
| campaign-tour-gate.tsx | Gate — triggers tour for new users |

---

## Polls — src/components/polls/

| Component | Purpose |
|---|---|
| swipe-poll.tsx | Social app swipe-to-vote UI |
| LiveResultsStream.tsx | Live results with WebSocket streaming |
| PollTicker.tsx | Scrolling poll results ticker |
| voter/NpsVoter.tsx | NPS-style vote widget |
| voter/TimelineRadarVoter.tsx | Timeline radar vote visualisation |
| voter/WordCloudVoter.tsx | Word cloud vote widget |

---

## Ops — src/components/ops/

| Component | Purpose |
|---|---|
| qa-overlay.tsx | QA inspection overlay |
| qa-overlay-gate.tsx | Gate for QA overlay |
| verification-checklist.tsx | Feature verification checklist |
| mark-recorded-modal.tsx | Mark feature as recorded |
| needs-update-flow.tsx | Trigger needs-update workflow |
| retroactive-queue.tsx | Retroactive backfill queue |
| script-viewer.tsx | Door/call script viewer |
| stats-bar.tsx | Ops statistics bar |
| video-status-badge.tsx | Video documentation status badge |

---

## Campaign — src/components/campaign/

| Component | Purpose |
|---|---|
| HealthScoreWidget.tsx | Campaign health score display |

---

## Approval — src/components/approval/

| Component | Purpose |
|---|---|
| approval-meter.tsx | Approval rating visualisation |

---

## Events — src/components/events/

| Component | Purpose |
|---|---|
| TownhallModerator.tsx | Live townhall moderation UI |

---

## Help — src/components/help/

| Component | Purpose |
|---|---|
| article-card.tsx | Help article card |
| ask-adoni-button.tsx | Context-sensitive Ask Adoni trigger |
| feedback-widget.tsx | Inline feedback widget |
| search-bar.tsx | Help search bar |
| video-player.tsx | Help video player |

---

## Social — src/components/social/

| Component | Purpose |
|---|---|
| social-nav.tsx | Poll City Social bottom navigation |
| notification-opt-in-prompt.tsx | Push notification opt-in |

---

## Public — src/components/public/

| Component | Purpose |
|---|---|
| candidate-site/candidate-page-client.tsx | Public candidate profile page |
| candidate-site/candidate-ward-map.tsx | Ward boundary map for candidate page |

---

## PWA — src/components/pwa/

| Component | Purpose |
|---|---|
| pwa-register.tsx | PWA service worker registration |
| offline-indicator.tsx | Offline status indicator |

---

## Security — src/components/security/

| Component | Purpose |
|---|---|
| turnstile-widget.tsx | Cloudflare Turnstile CAPTCHA |

---

## Calculator — src/components/calculator/

| Component | Purpose |
|---|---|
| campaign-cost-calculator.tsx | Campaign budget calculator |

---

## Theme — src/components/theme/

| Component | Purpose |
|---|---|
| theme-provider.tsx | Light/dark theme provider |
| theme-toggle.tsx | Theme toggle button |

---

## Debug — src/components/debug/

| Component | Purpose |
|---|---|
| debug-toolbar.tsx | Dev debug toolbar |
| debug-toolbar-gate.tsx | Gate — only renders in dev/debug mode |

---

## Tracking — src/components/tracking/

| Component | Purpose |
|---|---|
| analytics.tsx | Vercel Analytics + Speed Insights wrapper |

---

## UI Primitives — src/components/ui/

Custom-built primitives (not shadcn/ui).

| Component | Purpose |
|---|---|
| address-autocomplete.tsx | Address input with autocomplete |
| contact-autocomplete.tsx | Contact search autocomplete |
| CalendarSubscribeButton.tsx | Calendar subscribe (iCal) |
| command-center.tsx | Keyboard command palette (Ctrl+K) |
| error-message.tsx | Standardised error display |
| field-help.tsx | Inline field help tooltip |
| multi-select.tsx | Multi-select dropdown |
| toggle-switch.tsx | Toggle switch input |
| tooltip.tsx | Tooltip wrapper |
| index.tsx | Barrel exports |

---

## Common Import Patterns

```tsx
// Layout
import Sidebar from "@/components/layout/sidebar";
import { CampaignSwitcher } from "@/components/layout/campaign-switcher";

// Adoni
// Do NOT import adoni-chat directly — it mounts via the app shell

// Maps (must be dynamic with ssr: false)
import dynamic from "next/dynamic";
const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

// Icons
import { Search, ChevronRight, Users } from 'lucide-react';

// Animation
import { motion, AnimatePresence } from 'framer-motion';

// Charts
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// Toasts
import { toast } from 'sonner';

// Auth (server components)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// Auth (API routes)
import { apiAuth } from "@/lib/auth/helpers";

// Database
import { prisma } from "@/lib/db/prisma";

// Styling
import { cn } from "@/lib/utils";
```

---

## Common Patterns

**Status badge:**
```tsx
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  ACTIVE
</span>
```

**Stat card:**
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#0A2342] hover:shadow-sm transition-all cursor-pointer">
  <div className="flex items-center justify-between mb-2">
    <div className="p-2 rounded-lg bg-blue-50">
      <Icon className="w-4 h-4 text-blue-600" />
    </div>
    <ChevronRight className="w-4 h-4 text-gray-400" />
  </div>
  <div className="text-2xl font-bold text-[#0A2342]">{value}</div>
  <div className="text-xs text-gray-500 mt-1">{label}</div>
</div>
```

**Glassmorphic panel (Social app only):**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
```

**Party badge:**
```tsx
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">LIB</span>
```

**Animated entrance:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
```
