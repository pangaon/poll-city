/**
 * Form templates — pre-built field configurations for common campaign forms.
 * Used by the form builder's template picker.
 */

export interface FormTemplate {
  key: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  fields: {
    type: string;
    label: string;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: { value: string; label: string }[];
    crmField?: string;
    width?: string;
  }[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: "volunteer_intake",
    name: "Volunteer Intake",
    title: "Volunteer With Us",
    description: "Join our campaign team and make a difference in your community.",
    icon: "👋",
    fields: [
      { type: "name", label: "Full Name", required: true, crmField: "name" },
      { type: "email", label: "Email Address", required: true, crmField: "email" },
      { type: "phone", label: "Phone Number", crmField: "phone" },
      { type: "postal_code", label: "Postal Code", crmField: "postalCode" },
      { type: "multiselect", label: "When are you available?", required: true, options: [
        { value: "weekdays", label: "Weekdays" }, { value: "evenings", label: "Evenings" },
        { value: "weekends", label: "Weekends" }, { value: "flexible", label: "Flexible" },
      ]},
      { type: "multiselect", label: "What can you help with?", options: [
        { value: "canvassing", label: "Canvassing" }, { value: "phone_banking", label: "Phone Banking" },
        { value: "driving", label: "Driving" }, { value: "data_entry", label: "Data Entry" },
        { value: "social_media", label: "Social Media" }, { value: "events", label: "Events" },
        { value: "signs", label: "Sign Installation" },
      ]},
      { type: "textarea", label: "Tell us about yourself", placeholder: "Any previous campaign experience? Special skills?" },
      { type: "consent", label: "I consent to being contacted by the campaign regarding volunteer opportunities.", required: true },
    ],
  },
  {
    key: "petition",
    name: "Petition",
    title: "Sign Our Petition",
    description: "Add your name to support this important cause.",
    icon: "✍️",
    fields: [
      { type: "name", label: "Full Name", required: true, crmField: "name" },
      { type: "email", label: "Email Address", required: true, crmField: "email" },
      { type: "postal_code", label: "Postal Code", required: true, crmField: "postalCode" },
      { type: "text", label: "Ward/District", crmField: "ward" },
      { type: "textarea", label: "Why is this important to you?", placeholder: "Share your personal story..." },
      { type: "consent", label: "I consent to my name being included in this petition.", required: true },
    ],
  },
  {
    key: "supporter",
    name: "Supporter Sign Up",
    title: "Support Our Campaign",
    description: "Show your support and stay updated on the campaign.",
    icon: "💪",
    fields: [
      { type: "name", label: "Full Name", required: true, crmField: "name" },
      { type: "email", label: "Email Address", required: true, crmField: "email" },
      { type: "phone", label: "Phone Number", crmField: "phone" },
      { type: "address", label: "Street Address", crmField: "address" },
      { type: "postal_code", label: "Postal Code", crmField: "postalCode" },
      { type: "checkbox", label: "I would like a lawn sign", helpText: "We will contact you to arrange delivery." },
      { type: "consent", label: "I consent to receiving campaign updates via email.", required: true },
    ],
  },
  {
    key: "event_registration",
    name: "Event Registration",
    title: "Register for Our Event",
    description: "Reserve your spot at our upcoming event.",
    icon: "📅",
    fields: [
      { type: "name", label: "Full Name", required: true, crmField: "name" },
      { type: "email", label: "Email Address", required: true, crmField: "email" },
      { type: "phone", label: "Phone Number", crmField: "phone" },
      { type: "number", label: "Number of guests", placeholder: "1" },
      { type: "select", label: "Dietary requirements", options: [
        { value: "none", label: "No restrictions" }, { value: "vegetarian", label: "Vegetarian" },
        { value: "vegan", label: "Vegan" }, { value: "halal", label: "Halal" },
        { value: "kosher", label: "Kosher" }, { value: "gluten_free", label: "Gluten Free" },
        { value: "other", label: "Other (specify in notes)" },
      ]},
      { type: "textarea", label: "Any accessibility needs?", placeholder: "Let us know how we can accommodate you." },
      { type: "consent", label: "I consent to being contacted about this event.", required: true },
    ],
  },
  {
    key: "donor_intake",
    name: "Donor Intake",
    title: "Support Our Campaign Financially",
    description: "Ontario law requires donor information for contributions over $25.",
    icon: "💰",
    fields: [
      { type: "name", label: "Full Legal Name", required: true, crmField: "name", helpText: "As it appears on your ID — required for Ontario election finance reporting." },
      { type: "email", label: "Email Address", required: true, crmField: "email" },
      { type: "phone", label: "Phone Number", crmField: "phone" },
      { type: "address", label: "Home Address", required: true, crmField: "address", helpText: "Required by Ontario election law for all donations." },
      { type: "postal_code", label: "Postal Code", required: true, crmField: "postalCode" },
      { type: "text", label: "Employer", helpText: "Required for donations over $200." },
      { type: "select", label: "Donation amount", required: true, options: [
        { value: "25", label: "$25" }, { value: "50", label: "$50" }, { value: "100", label: "$100" },
        { value: "250", label: "$250" }, { value: "500", label: "$500" }, { value: "1200", label: "$1,200 (maximum)" },
        { value: "other", label: "Other amount" },
      ]},
      { type: "consent", label: "I confirm I am an Ontario resident and this donation is from my personal funds (not a corporation or union).", required: true },
    ],
  },
  {
    key: "survey",
    name: "Issue Survey",
    title: "What Issues Matter Most to You?",
    description: "Help us understand what our community cares about.",
    icon: "📊",
    fields: [
      { type: "name", label: "Name (optional)", crmField: "name" },
      { type: "email", label: "Email (optional)", crmField: "email" },
      { type: "postal_code", label: "Postal Code", crmField: "postalCode" },
      { type: "rating", label: "How satisfied are you with current representation?", helpText: "1 = Very unsatisfied, 5 = Very satisfied" },
      { type: "multiselect", label: "Top 3 issues for you", required: true, options: [
        { value: "housing", label: "Housing affordability" }, { value: "transit", label: "Public transit" },
        { value: "safety", label: "Community safety" }, { value: "environment", label: "Environment" },
        { value: "taxes", label: "Property taxes" }, { value: "development", label: "Development" },
        { value: "roads", label: "Roads and infrastructure" }, { value: "parks", label: "Parks and recreation" },
        { value: "education", label: "Education" }, { value: "healthcare", label: "Healthcare" },
      ]},
      { type: "textarea", label: "What would you change about your neighbourhood?", placeholder: "Tell us in your own words..." },
      { type: "consent", label: "I consent to being contacted about issues I care about.", required: true },
    ],
  },
  {
    key: "media_inquiry",
    name: "Media Inquiry",
    title: "Media Inquiry",
    description: "For press inquiries and interview requests.",
    icon: "📰",
    fields: [
      { type: "name", label: "Reporter Name", required: true, crmField: "name" },
      { type: "email", label: "Email", required: true, crmField: "email" },
      { type: "phone", label: "Phone", required: true, crmField: "phone" },
      { type: "text", label: "Media Outlet", required: true },
      { type: "select", label: "Inquiry Type", required: true, options: [
        { value: "interview", label: "Interview request" }, { value: "statement", label: "Request for statement" },
        { value: "event", label: "Event coverage" }, { value: "background", label: "Background briefing" },
        { value: "other", label: "Other" },
      ]},
      { type: "text", label: "Deadline", placeholder: "When do you need a response?" },
      { type: "textarea", label: "Details", required: true, placeholder: "What is the story about? What questions do you have?" },
    ],
  },
  {
    key: "endorsement",
    name: "Endorsement Request",
    title: "Endorse Our Campaign",
    description: "Stand with us and publicly support our vision for the community.",
    icon: "🏆",
    fields: [
      { type: "name", label: "Full Name", required: true, crmField: "name" },
      { type: "email", label: "Email", required: true, crmField: "email" },
      { type: "phone", label: "Phone", crmField: "phone" },
      { type: "text", label: "Title / Organization", placeholder: "e.g. President, Oak Street Residents Association" },
      { type: "textarea", label: "Why do you support this campaign?", required: true, placeholder: "Your endorsement may be featured on our website and materials." },
      { type: "checkbox", label: "I give permission for my name and endorsement to be shared publicly." },
      { type: "consent", label: "I consent to being contacted about my endorsement.", required: true },
    ],
  },
  {
    key: "contact",
    name: "Contact Form",
    title: "Get in Touch",
    description: "Have a question or concern? We would love to hear from you.",
    icon: "✉️",
    fields: [
      { type: "name", label: "Your Name", required: true, crmField: "name" },
      { type: "email", label: "Email Address", required: true, crmField: "email" },
      { type: "phone", label: "Phone Number", crmField: "phone" },
      { type: "select", label: "What is this about?", required: true, options: [
        { value: "support", label: "I want to support the campaign" },
        { value: "question", label: "I have a question about a policy" },
        { value: "concern", label: "I have a community concern" },
        { value: "volunteer", label: "I want to volunteer" },
        { value: "media", label: "Media inquiry" },
        { value: "other", label: "Something else" },
      ]},
      { type: "textarea", label: "Your Message", required: true, placeholder: "How can we help?" },
      { type: "consent", label: "I consent to being contacted by the campaign.", required: true },
    ],
  },
];

/** Get a template by key */
export function getTemplate(key: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.key === key);
}
