/**
 * Poll City — Centralized user-facing error messages.
 * Every error shown to users should come from this table.
 */

export interface ErrorInfo {
  title: string;
  description: string;
  action?: string;
  actionLink?: string;
  code?: string;
}

export const ERRORS = {
  // Import errors
  IMPORT_FILE_TOO_LARGE: {
    title: "File is too large",
    description:
      "Your file exceeds the 50MB limit. Please split it into smaller files and import each separately.",
    action: "Learn how to split CSV files",
    code: "IMPORT_001",
  },
  IMPORT_INVALID_FORMAT: {
    title: "File format not recognized",
    description:
      "We support CSV, Excel (.xlsx, .xls), and TSV files. Please convert your file to one of these formats.",
    action: "Download a sample import template",
    actionLink: "/api/import/template",
    code: "IMPORT_002",
  },
  IMPORT_NO_CONTACTS: {
    title: "No contacts found in file",
    description:
      "Your file appears to be empty or the header row is missing. Make sure the first row contains column names like First Name, Last Name, Phone, Email.",
    code: "IMPORT_003",
  },
  IMPORT_PARSE_FAILED: {
    title: "Could not read your file",
    description:
      "The file appears to be corrupt or uses an unsupported encoding. Try re-exporting from Excel as UTF-8 CSV.",
    code: "IMPORT_004",
  },
  IMPORT_MAPPING_INCOMPLETE: {
    title: "Some required fields are not mapped",
    description:
      "First name or last name must be mapped before you can proceed. Open the mapping dropdowns to choose which columns contain names.",
    code: "IMPORT_005",
  },

  // Contact errors
  DUPLICATE_EMAIL: {
    title: "Email address already exists",
    description:
      "A contact with this email is already in your database. Update the existing contact instead or use a different email address.",
    code: "CONTACT_001",
  },
  DUPLICATE_PHONE: {
    title: "Phone number already exists",
    description:
      "A contact with this phone number is already in your database. You can merge them or use a different number.",
    code: "CONTACT_002",
  },
  PHONE_INVALID: {
    title: "Phone number format not recognized",
    description:
      "Please enter a valid Canadian or US phone number. Examples: 416-555-1234, (416) 555-1234, +1 416 555 1234.",
    code: "CONTACT_003",
  },
  EMAIL_INVALID: {
    title: "Email address format not recognized",
    description: "Please enter a valid email address, for example: voter@example.com.",
    code: "CONTACT_004",
  },
  POSTAL_INVALID: {
    title: "Postal code format not recognized",
    description:
      "Please enter a Canadian postal code in the format A1A 1A1 (letter-number-letter space number-letter-number).",
    code: "CONTACT_005",
  },
  CONTACT_SAVE_FAILED: {
    title: "Could not save contact",
    description:
      "There was a problem saving this contact. Please check all required fields are filled in and try again.",
    code: "CONTACT_006",
  },
  CONTACT_NOT_FOUND: {
    title: "Contact not found",
    description:
      "This contact may have been deleted or does not belong to your campaign. Try refreshing the page.",
    code: "CONTACT_007",
  },

  // Auth/Permission errors
  PERMISSION_DENIED: {
    title: "You do not have permission to do this",
    description:
      "Your role does not allow this action. Contact your campaign administrator to request access.",
    code: "AUTH_001",
  },
  SESSION_EXPIRED: {
    title: "Your session has expired",
    description: "Please sign in again to continue. Your work has been saved.",
    action: "Sign in",
    actionLink: "/login",
    code: "AUTH_002",
  },
  UNAUTHORIZED: {
    title: "You must be signed in to do this",
    description: "Please sign in to access this feature.",
    action: "Sign in",
    actionLink: "/login",
    code: "AUTH_003",
  },

  // Network / server errors
  NETWORK_ERROR: {
    title: "Connection problem",
    description:
      "We could not reach the server. Check your internet connection and try again. If the problem continues, your data is saved locally and will sync when you reconnect.",
    code: "NET_001",
  },
  RATE_LIMIT: {
    title: "Too many requests",
    description:
      "You are sending requests too quickly. Please wait a moment and try again.",
    code: "NET_002",
  },
  SERVER_ERROR: {
    title: "Something went wrong on our end",
    description:
      "We hit an unexpected error. The problem has been logged. Please try again in a moment.",
    code: "NET_003",
  },

  // Notifications
  NOTIFICATION_SEND_FAILED: {
    title: "Notification could not be sent",
    description:
      "The push notification failed to send. Check that VAPID keys are configured in your environment variables and that subscribers are opted in.",
    action: "Check notification settings",
    actionLink: "/settings",
    code: "NOTIFY_001",
  },
  NOTIFICATION_NOT_SUBSCRIBED: {
    title: "Push notifications are not enabled",
    description:
      "Enable notifications in your browser settings to receive alerts from this campaign.",
    code: "NOTIFY_002",
  },

  // Export
  EXPORT_FAILED: {
    title: "Export could not be generated",
    description:
      "There was a problem generating your export. Please try again, or narrow your filters if the dataset is very large.",
    code: "EXPORT_001",
  },
  EXPORT_NO_DATA: {
    title: "No data to export",
    description:
      "Your current filters returned zero results. Adjust your filters and try again.",
    code: "EXPORT_002",
  },

  // Polls
  POLL_ALREADY_VOTED: {
    title: "You have already voted on this poll",
    description:
      "Your vote was recorded previously. Each voter can only answer a poll once — this keeps results fair.",
    code: "POLL_001",
  },
  POLL_ENDED: {
    title: "This poll has ended",
    description: "Voting closed on this poll. You can view results only.",
    code: "POLL_002",
  },

  // Billing
  BILLING_REQUIRED: {
    title: "Billing not set up",
    description:
      "Add a payment method to unlock this feature. Billing is managed securely through Stripe.",
    action: "Open billing",
    actionLink: "/billing",
    code: "BILL_001",
  },

  // Team management
  INVITE_ALREADY_MEMBER: {
    title: "This user is already a team member",
    description:
      "The email you entered belongs to someone already on this campaign. You can change their role instead.",
    code: "TEAM_001",
  },
  INVITE_SEND_FAILED: {
    title: "Invite email could not be sent",
    description:
      "The invitation was created but we couldn't send the notification email. Share the sign-in link with them directly.",
    code: "TEAM_002",
  },

  // Generic fallback
  UNKNOWN: {
    title: "Something went wrong",
    description:
      "An unexpected error occurred. Please try again. If the problem continues, contact support.",
    code: "UNKNOWN",
  },
} as const satisfies Record<string, ErrorInfo>;

export type ErrorKey = keyof typeof ERRORS;

/**
 * Resolve an error key to its full info object.
 */
export function getError(key: ErrorKey): ErrorInfo {
  return ERRORS[key];
}

/**
 * Safe lookup that returns UNKNOWN if the key doesn't match.
 */
export function lookupError(key: string): ErrorInfo {
  if (key in ERRORS) return ERRORS[key as ErrorKey];
  return ERRORS.UNKNOWN;
}
