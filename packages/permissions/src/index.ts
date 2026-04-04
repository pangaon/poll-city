/**
 * @poll-city/permissions
 *
 * Policy-check helpers. App-context aware.
 *
 * STRUCTURE:
 *   AppContext — which product is making the check
 *   policies   — one function per resource × action pair
 *
 * RULE: Every authorization decision goes through a policy function.
 *       No inline role comparisons in route handlers.
 *       No global User.role used for campaign-scoped decisions.
 *
 * CURRENT STATE: These are structural stubs defining the interface.
 * Phase 1 enforcement is in the route handlers directly (see src/lib/auth/helpers.ts).
 * Phase 2: route handlers import from this package instead.
 */

// ── Role constants ─────────────────────────────────────────────────────────

export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  CAMPAIGN_MANAGER: "CAMPAIGN_MANAGER",
  VOLUNTEER: "VOLUNTEER",
  PUBLIC_USER: "PUBLIC_USER",
} as const;

export type Role = typeof Role[keyof typeof Role];

// Membership roles — campaign-scoped. These are Membership.role values.
export const MembershipRole = {
  ADMIN: "ADMIN",
  CAMPAIGN_MANAGER: "CAMPAIGN_MANAGER",
  VOLUNTEER: "VOLUNTEER",
} as const;

export type MembershipRole = typeof MembershipRole[keyof typeof MembershipRole];

// ── App context ────────────────────────────────────────────────────────────
// Which product is the request coming from. Used to scope authorization.

export type AppContext = "admin" | "social" | "print" | "hq";

// ── Actor type ─────────────────────────────────────────────────────────────

export interface Actor {
  userId: string;
  userRole: Role;           // system-level role (User.role)
  membershipRole?: MembershipRole; // campaign-level role (Membership.role) — undefined if not a member
  campaignId?: string;      // active campaign context
  appContext: AppContext;
}

// ── Policy check result ────────────────────────────────────────────────────

export interface PolicyResult {
  allowed: boolean;
  reason?: string;          // human-readable reason for denial — for logging, not UI
}

const allow = (): PolicyResult => ({ allowed: true });
const deny = (reason: string): PolicyResult => ({ allowed: false, reason });

// ── Contact policies ───────────────────────────────────────────────────────

export const contactPolicies = {
  canRead(actor: Actor): PolicyResult {
    if (actor.appContext !== "admin") return deny("Contact data is campaign-private");
    if (!actor.membershipRole) return deny("No membership in this campaign");
    return allow();
  },

  canCreate(actor: Actor): PolicyResult {
    if (actor.appContext !== "admin") return deny("Contact data is campaign-private");
    if (!actor.membershipRole) return deny("No membership in this campaign");
    return allow(); // all membership roles can create contacts
  },

  canUpdate(actor: Actor): PolicyResult {
    if (actor.appContext !== "admin") return deny("Contact data is campaign-private");
    if (!actor.membershipRole) return deny("No membership in this campaign");
    return allow(); // all membership roles can update contacts
  },

  canDelete(actor: Actor): PolicyResult {
    if (actor.appContext !== "admin") return deny("Contact data is campaign-private");
    if (!actor.membershipRole) return deny("No membership in this campaign");
    const allowed = [MembershipRole.ADMIN, MembershipRole.CAMPAIGN_MANAGER].includes(actor.membershipRole);
    return allowed ? allow() : deny("Requires Campaign Manager or above membership role");
  },

  canExport(actor: Actor): PolicyResult {
    if (actor.appContext !== "admin") return deny("Contact data is campaign-private");
    const allowed = [MembershipRole.ADMIN, MembershipRole.CAMPAIGN_MANAGER].includes(actor.membershipRole as MembershipRole);
    return allowed ? allow() : deny("Requires Campaign Manager or above to export");
  },
};

// ── Campaign field policies ────────────────────────────────────────────────

export const campaignFieldPolicies = {
  canRead(actor: Actor): PolicyResult {
    if (!actor.membershipRole) return deny("No membership in this campaign");
    return allow();
  },

  canWrite(actor: Actor): PolicyResult {
    if (!actor.membershipRole) return deny("No membership in this campaign");
    const allowed = [MembershipRole.ADMIN, MembershipRole.CAMPAIGN_MANAGER].includes(actor.membershipRole);
    return allowed ? allow() : deny("Requires Campaign Manager or above membership role");
  },

  canDelete(actor: Actor): PolicyResult {
    if (!actor.membershipRole) return deny("No membership in this campaign");
    const allowed = [MembershipRole.ADMIN].includes(actor.membershipRole as "ADMIN");
    return allowed ? allow() : deny("Requires Admin membership role to delete fields");
  },
};

// ── Poll policies ──────────────────────────────────────────────────────────

export const pollPolicies = {
  canVote(_actor: Actor, pollVisibility: string): PolicyResult {
    // Public polls: anyone can vote (authenticated = identified, anon = pseudonymous)
    if (pollVisibility === "public" || pollVisibility === "unlisted") return allow();
    // campaign_only: must be an authenticated campaign member
    if (pollVisibility === "campaign_only") {
      if (!_actor.membershipRole) return deny("campaign_only poll requires campaign membership");
      return allow();
    }
    return deny("Unknown poll visibility");
  },

  canViewResults(_actor: Actor, pollVisibility: string): PolicyResult {
    return pollPolicies.canVote(_actor, pollVisibility);
  },

  canCreate(actor: Actor): PolicyResult {
    if (actor.appContext !== "admin") return deny("Polls are created in Admin");
    const allowed = [MembershipRole.ADMIN, MembershipRole.CAMPAIGN_MANAGER].includes(actor.membershipRole as MembershipRole);
    return allowed ? allow() : deny("Requires Campaign Manager or above to create polls");
  },
};

// ── Consent bridge policies ────────────────────────────────────────────────

export const bridgePolicies = {
  canSubmitSignal(actor: Actor): PolicyResult {
    // Must be authenticated — anonymous users cannot consent
    if (actor.userRole === "PUBLIC_USER" || actor.membershipRole) return allow();
    return deny("Must be authenticated to submit a consent signal");
  },

  canRevoke(actor: Actor, targetUserId: string): PolicyResult {
    // Users can only revoke their own consent
    if (actor.userId === targetUserId) return allow();
    if (actor.userRole === Role.SUPER_ADMIN) return allow();
    return deny("Can only revoke own consent records");
  },
};

// ── Campaign management policies ───────────────────────────────────────────

export const campaignPolicies = {
  canViewSettings(actor: Actor): PolicyResult {
    if (!actor.membershipRole) return deny("No membership in this campaign");
    const allowed = [MembershipRole.ADMIN, MembershipRole.CAMPAIGN_MANAGER].includes(actor.membershipRole);
    return allowed ? allow() : deny("Requires Campaign Manager or above");
  },

  canManageTeam(actor: Actor): PolicyResult {
    if (!actor.membershipRole) return deny("No membership in this campaign");
    return actor.membershipRole === MembershipRole.ADMIN
      ? allow()
      : deny("Requires Admin membership role to manage team");
  },

  canDelete(actor: Actor): PolicyResult {
    // Campaign deletion requires system-level SUPER_ADMIN
    return actor.userRole === Role.SUPER_ADMIN
      ? allow()
      : deny("Campaign deletion requires SUPER_ADMIN");
  },
};

// ── Data class boundary enforcer ───────────────────────────────────────────
// Used to validate that a response is appropriate for the app context.

export function assertPublicSafe(
  data: Record<string, unknown>,
  forbiddenFields: string[] = ["campaignId", "createdByUserId", "postalCodes", "claimedByUserId", "ipHash"]
): void {
  for (const field of forbiddenFields) {
    if (field in data) {
      // In production: log and strip. In development: throw.
      if (process.env.NODE_ENV === "development") {
        throw new Error(`Public response contains private field: ${field}`);
      }
      delete data[field];
    }
  }
}
