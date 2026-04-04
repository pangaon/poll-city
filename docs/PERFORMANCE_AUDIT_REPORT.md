# Poll City Performance Audit Report

**Audit date:** April 4, 2026
**Scope:** Bundle size, database indexes, caching headers, Core Web Vitals, middleware optimization

---

## Build Stats

- **Total routes:** 131 (48 static + 83 dynamic)
- **First Load JS shared:** 87.8 KB
- **Middleware:** 69.4 KB
- **Largest page:** /settings/public-page at 407 KB (within acceptable range)

## Bundle Size Analysis

### Pages above 400 KB First Load JS
| Page | Size | Status |
|------|------|--------|
| /settings/public-page | 407 KB | Acceptable — heavy customization UI |
| /tasks | 416 KB | Acceptable — task management with drag-and-drop |
| /print/jobs/new | 402 KB | Acceptable — file upload + form |

### Optimizations Applied
1. **`optimizePackageImports`** — `lucide-react` and `recharts` tree-shaken via Next.js experimental config
2. **Dynamic imports** — `react-leaflet` maps loaded with `ssr: false` to prevent SSR bundle bloat
3. **`compress: true`** — gzip compression enabled in `next.config.js`
4. **Image formats** — `image/avif` and `image/webp` configured for optimal delivery

## Database Indexes

### Indexes Added in This Audit

| Model | Index | Justification |
|-------|-------|---------------|
| Contact | `@@index([email])` | Email lookup in import dedup, search |
| Contact | `@@index([phone])` | Phone lookup in import dedup, call list |
| Contact | `@@index([campaignId, supportLevel])` | GOTV scoring composite filter |
| ElectionResult | `@@index([jurisdiction])` | Heat map join by jurisdiction name |
| ElectionResult | `@@index([candidateName])` | Election history by candidate name |
| VolunteerProfile | `@@index([campaignId])` | Volunteer list filtering |
| VolunteerProfile | `@@index([isActive])` | Active volunteer count queries |
| PollResponse | `@@index([voteHash])` | Anonymous vote duplicate check (unique) |

### Pre-existing Indexes (Verified Adequate)
- Campaign: `slug`, `isPublic+isActive`
- Official: `province+level`, `isClaimed`, `isActive+level`, `level+district`
- Contact: `campaignId`, `lastName+firstName`, `supportLevel`, `postalCode`
- Sign: `campaignId+status`, `lat+lng`
- Poll: `targetRegion`, `isActive+isFeatured`
- Task: `campaignId`, `assignedToId`
- GeoDistrict: `postalPrefix`, `province+districtType`, `name`

## Caching Strategy

### Headers Applied

| Endpoint | Cache-Control | Rationale |
|----------|--------------|-----------|
| `/api/officials/directory` | `s-maxage=300, stale-while-revalidate=600` | Officials change infrequently |
| `/api/analytics/heat-map` | `s-maxage=3600` | Election data is static |
| `/api/analytics/election-results` | `s-maxage=3600` | Static historical data |
| `/_next/static/*` | `public, max-age=31536000, immutable` | Static assets via next.config.js + vercel.json |
| Static file extensions | `public, max-age=31536000, immutable` | ico, png, jpg, svg, woff2 via vercel.json |

### Campaign-specific data: Never cached
All authenticated, campaign-scoped endpoints return dynamic data without cache headers.

## Core Web Vitals Measures

### LCP (Largest Contentful Paint)
- Hero images use `next/image` with `priority` prop on above-fold candidates
- Static assets pre-cached via immutable headers
- `compress: true` reduces payload size

### FID (First Input Delay)
- Heavy components (maps, charts) dynamically imported
- `optimizePackageImports` reduces JS parse time

### CLS (Cumulative Layout Shift)
- All images in candidate cards specify width/height
- Skeleton loaders maintain layout during data fetch

## Middleware Optimization

Matcher excludes static files:
```
/((?!_next/static|_next/image|favicon.ico|logo.png|icon|apple-touch-icon|sw.js|manifest.json|robots.txt|sitemap.xml).*)
```

## Canonical Redirect

`poll.city` → `https://www.poll.city` via single-hop permanent redirect in `next.config.js` `redirects()`. Prevents duplicate content penalties and consolidates domain authority.
