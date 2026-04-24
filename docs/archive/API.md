# Poll City API Documentation

Base URL: `http://localhost:3000/api` (dev) or `https://yourdomain.com/api` (prod)

All authenticated endpoints require a valid session cookie (set by NextAuth on login).

---

## Authentication

### POST `/api/auth/callback/credentials`
Sign in with email and password.

**Body:**
```json
{ "email": "admin@pollcity.dev", "password": "password123" }
```

**Response:** Sets `next-auth.session-token` cookie.

---

## Campaigns

### GET `/api/campaigns`
List campaigns for the authenticated user.

**Response:**
```json
{
  "data": [{ "id": "...", "name": "Ward 12 Campaign", "slug": "ward-12-2026", "electionType": "municipal", "userRole": "ADMIN", "_count": { "contacts": 10, "tasks": 5 } }]
}
```

### POST `/api/campaigns`
Create a campaign. **Requires: ADMIN role.**

**Body:**
```json
{
  "name": "My Campaign",
  "electionType": "municipal",
  "jurisdiction": "City of Toronto — Ward 5",
  "electionDate": "2026-10-26T00:00:00Z",
  "candidateName": "Sam Rivera",
  "primaryColor": "#1e40af"
}
```

---

## Contacts

### GET `/api/contacts`
List contacts with pagination and filters.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| campaignId | string (required) | Campaign ID |
| page | number | Page number (default: 1) |
| pageSize | number | Per page (default: 25, max: 100) |
| search | string | Search name, email, phone, address |
| supportLevel | enum | Filter by support level |
| followUpNeeded | boolean | Filter follow-ups |
| volunteerInterest | boolean | Filter volunteer interest |
| signRequested | boolean | Filter sign requests |
| tagId | string | Filter by tag |

**Response:**
```json
{
  "data": [...],
  "total": 142,
  "page": 1,
  "pageSize": 25,
  "totalPages": 6
}
```

### POST `/api/contacts`
Create a contact.

**Body:**
```json
{
  "campaignId": "...",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "416-555-0100",
  "address1": "123 Main St",
  "city": "Toronto",
  "province": "ON",
  "postalCode": "M4C 1A1",
  "ward": "Ward 12",
  "supportLevel": "undecided",
  "issues": ["Transit", "Housing"],
  "signRequested": false,
  "volunteerInterest": true,
  "notes": "Met at community event"
}
```

### GET `/api/contacts/:id`
Get a single contact with full interaction history and tasks.

### PATCH `/api/contacts/:id`
Update a contact (partial update).

### DELETE `/api/contacts/:id`
Delete a contact. **Requires: ADMIN or CAMPAIGN_MANAGER.**

---

## Interactions

### POST `/api/interactions`
Log an interaction with a contact.

**Body:**
```json
{
  "contactId": "...",
  "type": "door_knock",
  "notes": "Spoke at the door for 5 minutes. Interested in transit platform.",
  "supportLevel": "leaning_support",
  "issues": ["Transit"],
  "signRequested": false,
  "volunteerInterest": true,
  "followUpNeeded": false
}
```

**Interaction types:** `door_knock` | `phone_call` | `text` | `email` | `event` | `note` | `follow_up`

**Support levels:** `strong_support` | `leaning_support` | `undecided` | `leaning_opposition` | `strong_opposition` | `unknown`

---

## Tasks

### GET `/api/tasks`
List tasks for a campaign.

**Query params:** `campaignId`, `status`, `assignedToId`, `mine=true`, `page`, `pageSize`

### POST `/api/tasks`
Create a task.

**Body:**
```json
{
  "campaignId": "...",
  "title": "Follow up with Jane Smith",
  "description": "Discuss transit concerns from door knock on April 2nd",
  "priority": "high",
  "status": "pending",
  "dueDate": "2026-04-10T00:00:00Z",
  "assignedToId": "...",
  "contactId": "..."
}
```

**Priorities:** `low` | `medium` | `high` | `urgent`
**Statuses:** `pending` | `in_progress` | `completed` | `cancelled`

### PATCH `/api/tasks/:id`
Update task (supports partial updates). Set `status: "completed"` to mark done.

### DELETE `/api/tasks/:id`
Delete a task.

---

## Canvassing

### GET `/api/canvass`
List canvass lists for a campaign.

**Query:** `campaignId`

### POST `/api/canvass`
Create a canvass list.

**Body:**
```json
{
  "campaignId": "...",
  "name": "East Ward 12 — April Blitz",
  "description": "Focus on undecided voters on Maple and Oak streets"
}
```

### POST `/api/canvass/assign`
Assign a volunteer to a canvass list.

**Body:**
```json
{
  "canvassListId": "...",
  "userId": "..."
}
```

---

## Officials (Public)

### GET `/api/officials`
Find officials. No authentication required.

**Query params:**
| Param | Description |
|-------|-------------|
| postalCode | Lookup officials for a postal code (e.g. M4C1A1) |
| search | Search by name, district, title |

**Response:**
```json
{
  "data": [{
    "id": "...",
    "name": "Jamie Park",
    "title": "City Councillor",
    "level": "municipal",
    "district": "Ward 12",
    "party": "Independent",
    "subscriptionStatus": "verified",
    "_count": { "follows": 42, "questions": 8 }
  }]
}
```

---

## Polls

### GET `/api/polls`
List polls. Public endpoint.

**Query params:** `postalCode`, `featured=true`, `campaignId`

### POST `/api/polls`
Create a poll. Requires authentication.

**Body:**
```json
{
  "question": "Do you support expanding bike lanes on Danforth?",
  "type": "binary",
  "visibility": "public",
  "targetRegion": "Ward 12",
  "targetPostalPrefixes": ["M4C", "M4J"],
  "tags": ["transit", "cycling"]
}
```

**Poll types:** `binary` | `multiple_choice` | `ranked` | `slider` | `swipe`

### POST `/api/polls/:id/respond`
Submit a poll response. No authentication required for anonymous voting.

**Body (binary):**
```json
{ "value": "yes", "postalCode": "M4C 1A1" }
```

**Body (multiple choice):**
```json
{ "optionId": "...", "postalCode": "M4C 1A1" }
```

**Body (slider):**
```json
{ "value": "72", "postalCode": "M4C 1A1" }
```

### GET `/api/polls/:id/respond`
Get poll results.

---

## Import / Export

### GET `/api/import-export`
Export contacts as CSV.

**Query params:** `campaignId`, `type=contacts`

**Response:** CSV file download

### POST `/api/import-export`
Import contacts from parsed CSV.

**Body:**
```json
{
  "campaignId": "...",
  "rows": [
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "416-555-0100",
      "address1": "123 Main St",
      "city": "Toronto",
      "province": "ON",
      "postalCode": "M4C 1A1",
      "supportLevel": "undecided"
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "imported": 47,
    "skipped": 3,
    "errors": ["Row 5: firstName is required", "Row 12: invalid email format"]
  }
}
```

---

## AI Assist

### GET `/api/ai-assist`
Check if AI is in live or mock mode.

**Response:**
```json
{ "isMock": true }
```

### POST `/api/ai-assist`
Query the AI assistant.

**Body (summarize voter):**
```json
{
  "action": "summarize_voter",
  "campaignId": "...",
  "contactId": "..."
}
```

**Body (generate script):**
```json
{
  "action": "generate_script",
  "campaignId": "...",
  "contactId": "..."
}
```

**Body (free chat):**
```json
{
  "action": "chat",
  "campaignId": "...",
  "prompt": "What are the top 5 follow-up priorities this week?"
}
```

**Response:**
```json
{
  "data": {
    "text": "Based on your campaign data...",
    "provider": "anthropic",
    "isMock": false
  }
}
```

---

## Social Signals

### POST `/api/social/signal`
Send a public support signal. Requires authentication.

**Body:**
```json
{
  "officialId": "...",
  "type": "strong_support",
  "message": "Chris has been great for our riding!"
}
```

**Signal types:** `strong_support` | `general_support` | `sign_request` | `do_not_contact` | `volunteer_interest` | `question`

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "details": { ... }
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing params |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role or not a campaign member) |
| 404 | Resource not found |
| 422 | Validation failed (see `details`) |
| 500 | Server error |
