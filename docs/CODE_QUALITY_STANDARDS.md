# Poll City Code Quality Standards

**Established:** April 4, 2026
**Applies to:** All contributors (human and AI)

---

## TypeScript

- **Strict mode:** Always enabled (`strict: true` in tsconfig.json)
- **No `any` types:** Use proper interfaces. If truly dynamic, use `unknown` with type guards.
- **No non-null assertions (`!`)** unless the non-null condition is verified within 5 lines above
- **Import aliases:** Use `@/*` for `./src/*`

## API Routes

### Authentication
Every protected API route MUST call `apiAuth(req)` before any database operation.

```typescript
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  // ... proceed with session.user.id
}
```

### Tenant Isolation
Every query that returns campaign-scoped data MUST verify membership:

```typescript
const membership = await prisma.membership.findUnique({
  where: { userId_campaignId: { userId: session!.user.id, campaignId } },
});
if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### Input Validation
Every POST/PATCH route MUST validate input with Zod:

```typescript
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
}
```

### Error Handling
- Always wrap database operations in try/catch
- Log full errors server-side: `console.error("Context:", e);`
- Return only generic messages to client: `{ error: "Operation failed" }`
- Never return `(e as Error).message` or stack traces

### Rate Limiting
All public endpoints MUST call `rateLimit(req, tier)` at the top of the handler:
- `"auth"` — 10/min/IP for authentication flows
- `"form"` — 5/hour/IP for form submissions
- `"read"` — 100/min/IP for read-only public data

## Database

### Prisma Only
- Never use `prisma.$queryRaw` or `prisma.$executeRaw` with string concatenation
- Always use Prisma ORM methods for type safety and SQL injection prevention
- Add `@@index` for every field used in `where`, `orderBy`, or join conditions

### Indexes
Add indexes proactively when creating new models. Every `campaignId` foreign key needs an index.

## React Components

### Error Boundaries
Wrap major feature sections with `<ErrorBoundary>` from `src/components/error-boundary.tsx`. If the contacts list crashes, it should not crash the entire dashboard.

### Loading States
Every async data fetch must have a loading state. No blank white screens. Use skeleton loaders for lists and spinner indicators for buttons.

### Empty States
Every list view must have a designed empty state: icon/illustration, heading, description, and call-to-action.

## Security

### File Uploads
- Validate magic bytes, not just MIME type headers
- Enforce file size limits (5 MB for images, 25 MB for print files)
- Verify campaign membership before accepting uploads
- Store files in object storage (Vercel Blob), never serve directly

### Session / Auth
- Never hardcode secrets; always use environment variables
- Never expose server secrets via `NEXT_PUBLIC_` prefix
- Public keys (e.g., VAPID) are the only exception

### Anonymous Polling
- PollResponse must never store userId alongside vote data for new responses
- Use SHA-256 voteHash for duplicate prevention
- Provide voter receipts for verification
- See `docs/ANONYMOUS_POLLING_TECHNICAL.md` for full specification

## Commits

Every commit that changes user-facing features must update:
1. `src/app/(marketing)/marketing-client.tsx` — product features
2. `docs/USER_GUIDE.md` — user-facing SOPs
3. `docs/CHANGELOG.md` — technical changelog
