# API and Integration Contracts

## Principle

The boundary between products is enforced by DTO (Data Transfer Object) shape, not just route auth. Public DTOs expose only public-safe fields. Private DTOs are never returned by public routes.

---

## Public DTOs (safe to return to any caller, including Social and anonymous)

### OfficialPublicDTO
Returned by: `GET /api/officials`, `GET /api/officials/[id]`

```typescript
interface OfficialPublicDTO {
  id: string;
  name: string;
  title: string;
  district: string;
  level: "federal" | "provincial" | "municipal" | "school_board";
  party: string | null;
  bio: string | null;
  email: string | null;      // public contact — official's office email
  phone: string | null;      // public contact — official's office phone
  website: string | null;
  photoUrl: string | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  _count: {
    follows: number;
    questions: number;
  };
}
// EXCLUDED: postalCodes[], claimedByUserId, claimedAt, termStart, termEnd
```

### PollPublicDTO
Returned by: `GET /api/polls` (public visibility only), `GET /api/polls/[id]/respond`

```typescript
interface PollPublicDTO {
  id: string;
  question: string;
  description: string | null;
  type: PollType;
  visibility: "public" | "unlisted";  // campaign_only never returned publicly
  targetRegion: string | null;
  totalResponses: number;
  isActive: boolean;
  isFeatured: boolean;
  startsAt: string;
  endsAt: string | null;
  options: PollOptionPublicDTO[];
  _count: { responses: number };
}
// EXCLUDED: campaignId, createdByUserId

interface PollOptionPublicDTO {
  id: string;
  text: string;
  order: number;
}
```

### PollResultDTO (aggregate only — never individual votes)
```typescript
// Binary / Slider
interface BinaryResultDTO {
  type: "binary";
  results: { value: string; _count: number }[];
  poll: PollPublicDTO;
}

// Multiple choice
interface MultipleChoiceResultDTO {
  type: "multiple_choice";
  results: (PollOptionPublicDTO & { count: number })[];
  poll: PollPublicDTO;
}

// Ranked
interface RankedResultDTO {
  type: "ranked";
  results: (PollOptionPublicDTO & { count: number; avgRank: number | null })[];
  poll: PollPublicDTO;
}

// Slider
interface SliderResultDTO {
  type: "slider";
  results: { average: number | null; count: number };
  poll: PollPublicDTO;
}

// Swipe
interface SwipeResultDTO {
  type: "swipe" | "image_swipe";
  results: (PollOptionPublicDTO & {
    breakdown: { value: string; _count: number }[];
  })[];
  poll: PollPublicDTO;
}
```

### PublicQuestionDTO
```typescript
interface PublicQuestionDTO {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  isPublic: boolean;
  upvotes: number;
  createdAt: string;
}
// EXCLUDED: userId (voter identity never exposed)
```

### GeoDistrictDTO
```typescript
interface GeoDistrictDTO {
  postalPrefix: string;
  ward: string | null;
  wardCode: string | null;
  riding: string | null;
  ridingCode: string | null;
  province: string | null;
  city: string | null;
  level: string;
}
```

---

## Private DTOs (Admin only — never returned by public routes)

### ContactPrivateDTO
Campaign-private. Returned only by routes with auth + membership verification.

```typescript
interface ContactPrivateDTO {
  id: string;
  campaignId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  city: string | null;
  postalCode: string | null;
  ward: string | null;
  riding: string | null;
  supportLevel: SupportLevel;
  gotvStatus: GotvStatus;
  followUpNeeded: boolean;
  followUpDate: string | null;
  notHome: boolean;
  doNotContact: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
  notes: string | null;
  issues: string[];
  tags: ContactTagDTO[];
  // ... all other contact fields
}
// This DTO is NEVER returned by /api/officials, /api/polls, /api/geo, or any Social route
```

### CampaignPrivateDTO
```typescript
interface CampaignPrivateDTO {
  id: string;
  name: string;
  electionType: string;
  jurisdiction: string | null;
  electionDate: string | null;
  candidateName: string | null;
  candidateTitle: string | null;
  candidateBio: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  primaryColor: string;
}
// Returned only to campaign members
```

---

## Consent Bridge Contract

### BridgeSignalDTO (Social → API → CRM)
```typescript
interface BridgeSignalDTO {
  signalType:
    | "support"
    | "oppose"
    | "neutral"
    | "volunteer_optin"
    | "sign_request"
    | "contact_permission"
    | "update_optin";
  campaignId: string;          // which campaign
  officialId?: string;         // if signal is about an official
  userProvided?: {
    firstName?: string;        // only if user typed it
    phone?: string;            // only if user typed it
    address?: string;          // only if user typed it (for sign requests)
    signType?: string;
    notificationType?: string; // for update opt-in
    permissionScope?: string;  // for contact permission: "call" | "email" | "text"
  };
  postalCode?: string;         // from user's profile if available
}
// userId is taken from session — never from request body (prevents impersonation)
```

### BridgeResultDTO (response to Social)
```typescript
interface BridgeResultDTO {
  recorded: boolean;
  consentId: string;    // Reference for revocation
  message: string;      // User-facing confirmation
}
```

---

## Internal Event Types (packages/events)

For future event bus between products. Not implemented in Phase 1.

```typescript
type PlatformEvent =
  | {
      type: "CONSENT_SIGNAL_RECEIVED";
      payload: {
        userId: string;
        campaignId: string;
        signalType: string;
        contactId: string;  // created or updated
        auditId: string;    // ActivityLog.id
      };
    }
  | {
      type: "CONTACT_UPDATED";
      payload: { contactId: string; campaignId: string; changedFields: string[] };
    }
  | {
      type: "POLL_PUBLISHED";
      payload: { pollId: string; campaignId: string | null };
    }
  | {
      type: "GOTV_VOTER_CONFIRMED";
      payload: { contactId: string; campaignId: string };
    }
  | {
      type: "SIGN_INSTALLED";
      payload: { signId: string; campaignId: string };
    };
```

---

## API Versioning Policy

Phase 1: No versioning. All routes at `/api/[route]`.

Phase 2 (when apps split):
- Internal API (Admin → DB): no versioning needed (same codebase)
- Public API (Social → API): version prefix: `/api/v1/[route]`
- Bridge API: `/api/v1/bridge/[route]`
- Breaking changes require a new version prefix and a deprecation period

---

## Response Envelope

All API responses use a consistent envelope:

```typescript
// Success
{ data: T }

// Success with pagination
{ data: T[], total: number, page: number, pageSize: number, totalPages: number }

// Error
{ error: string, details?: object }
```

Status codes used:
- 200: success
- 201: created
- 400: bad request (missing required fields)
- 401: unauthenticated
- 403: forbidden (auth but no permission)
- 404: not found
- 409: conflict (e.g. duplicate vote)
- 410: gone (e.g. poll ended)
- 413: payload too large
- 422: validation failed
- 500: unhandled server error
