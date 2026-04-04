/**
 * BUILT-IN FIELD DEFINITIONS
 *
 * These are the standard fields that exist as real columns on the Contact model.
 * Campaigns can toggle their visibility in canvassing cards and the contacts table.
 * They cannot be deleted, but can be shown/hidden.
 *
 * Stored in CampaignField table with isVisible toggle, using reserved keys.
 */

export const BUILT_IN_FIELDS = [
  // Contact info
  { key: "__phone", label: "Phone", category: "contact_info", showOnCard: true, showOnList: true },
  { key: "__email", label: "Email", category: "contact_info", showOnCard: false, showOnList: true },
  { key: "__address", label: "Address", category: "contact_info", showOnCard: true, showOnList: true },
  { key: "__ward", label: "Ward", category: "contact_info", showOnCard: true, showOnList: true },
  { key: "__riding", label: "Riding", category: "contact_info", showOnCard: false, showOnList: true },
  { key: "__preferred_language", label: "Preferred Language", category: "contact_info", showOnCard: true, showOnList: false },
  { key: "__gender", label: "Gender", category: "contact_info", showOnCard: false, showOnList: false },

  // Canvassing
  { key: "__support_level", label: "Support Level", category: "canvassing", showOnCard: true, showOnList: true },
  { key: "__gotv_status", label: "GOTV Status", category: "canvassing", showOnCard: true, showOnList: false },
  { key: "__follow_up", label: "Follow-up Needed", category: "canvassing", showOnCard: true, showOnList: true },
  { key: "__sign_requested", label: "Sign Requested", category: "canvassing", showOnCard: true, showOnList: true },
  { key: "__volunteer_interest", label: "Volunteer Interest", category: "canvassing", showOnCard: true, showOnList: true },
  { key: "__issues", label: "Issues", category: "canvassing", showOnCard: true, showOnList: false },
  { key: "__notes", label: "Notes", category: "canvassing", showOnCard: true, showOnList: false },
  { key: "__not_home", label: "Not Home", category: "canvassing", showOnCard: true, showOnList: false },

  // Membership (leadership races)
  { key: "__membership_sold", label: "Membership Sold", category: "membership", showOnCard: false, showOnList: false },
  { key: "__is_active_member", label: "Is Active Member", category: "membership", showOnCard: false, showOnList: false },
  { key: "__membership_expiry", label: "Membership Expiry", category: "membership", showOnCard: false, showOnList: false },
  { key: "__first_choice", label: "First Choice", category: "membership", showOnCard: true, showOnList: true },
  { key: "__second_choice", label: "Second Choice", category: "membership", showOnCard: true, showOnList: true },
  { key: "__captain", label: "Captain", category: "membership", showOnCard: false, showOnList: true },

  // Electoral
  { key: "__federal_district", label: "Federal District", category: "electoral", showOnCard: false, showOnList: false },
  { key: "__federal_poll", label: "Federal Poll", category: "electoral", showOnCard: false, showOnList: false },
  { key: "__provincial_district", label: "Provincial District", category: "electoral", showOnCard: false, showOnList: false },
  { key: "__provincial_poll", label: "Provincial Poll", category: "electoral", showOnCard: false, showOnList: false },
  { key: "__municipal_district", label: "Municipal District", category: "electoral", showOnCard: false, showOnList: false },
  { key: "__municipal_poll", label: "Municipal Poll #", category: "electoral", showOnCard: false, showOnList: false },
  { key: "__voting_location", label: "Voting Location", category: "electoral", showOnCard: false, showOnList: false },
] as const;

export type BuiltInFieldKey = typeof BUILT_IN_FIELDS[number]["key"];

/**
 * Ensure all built-in field definitions exist for a campaign.
 * Called when a campaign is created or when settings are loaded.
 */
export async function ensureBuiltInFields(campaignId: string, prismaClient: any) {
  for (const field of BUILT_IN_FIELDS) {
    await prismaClient.campaignField.upsert({
      where: { campaignId_key: { campaignId, key: field.key } },
      update: {},
      create: {
        campaignId,
        key: field.key,
        label: field.label,
        fieldType: "text", // built-in fields use native rendering, fieldType is informational
        category: field.category,
        showOnCard: field.showOnCard,
        showOnList: field.showOnList,
        isVisible: true,
        sortOrder: 0,
      },
    });
  }
}
