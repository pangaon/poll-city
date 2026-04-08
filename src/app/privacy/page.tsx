import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Poll City",
  description: "Privacy Policy for Poll City — the campaign management platform for Canadian political campaigns.",
};

const sections = [
  { id: "information-collected", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "who-has-access", label: "Who Has Access" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "data-retention", label: "Data Retention" },
  { id: "political-data", label: "Political & Campaign Data" },
  { id: "user-rights", label: "Your Rights" },
  { id: "security", label: "Security" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-700 hover:text-blue-800 transition-colors">
            <span className="text-xl">🗳️</span>
            Poll City
          </Link>
          <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Terms of Service →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Effective date: April 2026 &nbsp;·&nbsp; Governing law: Ontario, Canada</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Poll City (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting the privacy of campaign staff,
            volunteers, and the individuals whose data is managed through our platform. This Privacy Policy explains what
            information we collect, how we use it, and the rights you have over your data.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Table of Contents</p>
          <ol className="space-y-1.5">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                  {i + 1}. {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose prose-gray max-w-none space-y-10">

          {/* 1. Information Collected */}
          <section id="information-collected">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Poll City is a Software-as-a-Service (SaaS) platform designed for use by political campaigns and their staff.
              The categories of data we collect and process include:
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">Account &amp; Platform Users</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Full name, email address, and password (hashed)</li>
              <li>Role within the campaign (Admin, Campaign Manager, Volunteer, etc.)</li>
              <li>Two-factor authentication settings and session metadata</li>
              <li>Login timestamps and IP addresses (for security auditing)</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">Voter &amp; Contact Records (entered by campaigns)</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Full name, residential address, phone number, and email address</li>
              <li>Political affiliation, support level, and voting likelihood scores</li>
              <li>Canvassing interaction history (date, doorstep responses, volunteer notes)</li>
              <li>Donation records and financial contribution data</li>
              <li>Geographic location data used for canvassing turf assignment and walk lists</li>
              <li>Custom field data added by the campaign (e.g., issues of concern, language preference)</li>
              <li>Volunteer availability, shift history, and expense records</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">Automatically Collected Data</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Browser type, device type, and operating system</li>
              <li>Pages visited, features used, and interaction logs (for product improvement)</li>
              <li>Approximate location (city/region level) derived from IP address</li>
              <li>Error logs and performance diagnostics</li>
            </ul>
          </section>

          {/* 2. How We Use Information */}
          <section id="how-we-use">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><strong>Deliver the platform:</strong> Provide campaign management, voter contact management, canvassing coordination, event management, and GOTV (Get Out The Vote) tools.</li>
              <li><strong>Power the Adoni AI assistant:</strong> Process natural-language queries to generate campaign insights, draft communications, and surface contact intelligence. Prompts and relevant data are sent to Anthropic&rsquo;s API for processing.</li>
              <li><strong>Communications:</strong> Enable campaigns to send email, SMS, and social media outreach to their supporters and volunteers.</li>
              <li><strong>Analytics &amp; reporting:</strong> Provide campaign dashboards, canvassing progress reports, donation summaries, and voter engagement analytics.</li>
              <li><strong>Security &amp; abuse prevention:</strong> Detect unauthorized access, prevent fraud, and enforce our Terms of Service.</li>
              <li><strong>Platform improvement:</strong> Understand how features are used and prioritize product development (aggregated and anonymized).</li>
              <li><strong>Billing &amp; subscription management:</strong> Process subscription payments and manage accounts.</li>
            </ul>
          </section>

          {/* 3. Who Has Access */}
          <section id="who-has-access">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">3. Who Has Access</h2>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Within the Campaign</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Access to campaign data is controlled by role-based permissions set by the campaign administrator:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
              <li><strong>Campaign Administrators:</strong> Full access to all contacts, analytics, settings, and billing.</li>
              <li><strong>Campaign Managers:</strong> Access to contacts, canvassing data, volunteers, events, and communications. Billing may be restricted.</li>
              <li><strong>Volunteers / Canvassers:</strong> Access limited to their assigned turf, tasks, and doorstep interaction forms. They cannot view full voter records or other volunteers&rsquo; data.</li>
              <li><strong>Finance Roles:</strong> Access restricted to donation records, budget, and financial reports.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">Poll City Staff</h3>
            <p className="text-gray-700 leading-relaxed">
              Poll City employees and contractors may access campaign data only for the purposes of providing technical support,
              investigating platform issues, or fulfilling legal obligations. Access is logged and audited. We do not use
              campaign voter data for any commercial or advertising purposes.
            </p>
          </section>

          {/* 4. Third-Party Services */}
          <section id="third-party">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">4. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Poll City uses a limited number of third-party services to operate the platform. Data shared with these providers
              is governed by their respective privacy policies and is used only to deliver services to you.
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-1">Anthropic AI (Claude / Adoni)</p>
                <p className="text-sm text-gray-600">
                  Our Adoni AI assistant is powered by Anthropic&rsquo;s Claude API. When you use Adoni, relevant context
                  (campaign summaries, contact counts, draft requests) is sent to Anthropic for processing. We do not send
                  individual personally-identifiable voter records to Anthropic unless you explicitly paste such content
                  into a prompt. Anthropic&rsquo;s API data is governed by{" "}
                  <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Anthropic&rsquo;s Privacy Policy
                  </a>.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-1">OpenStreetMap</p>
                <p className="text-sm text-gray-600">
                  Canvassing maps are rendered using OpenStreetMap tiles. Address data used to generate walk lists and turf
                  boundaries is geocoded using open mapping services. Geographic queries may be sent to tile or geocoding
                  servers. No personally identifiable voter information is included in mapping requests.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-1">Email &amp; SMS Providers</p>
                <p className="text-sm text-gray-600">
                  When campaigns send email or SMS communications through Poll City, recipient contact information (name,
                  email, phone) is transmitted to our email and SMS delivery providers. These providers act as data
                  processors on behalf of the campaign. We require all communication providers to comply with applicable
                  Canadian anti-spam legislation (CASL) and privacy regulations.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-1">Payment Processing</p>
                <p className="text-sm text-gray-600">
                  Subscription payments are handled by a third-party payment processor. Poll City does not store full
                  credit card numbers. Payment processors are PCI-DSS compliant.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800 mb-1">Infrastructure</p>
                <p className="text-sm text-gray-600">
                  Poll City is hosted on cloud infrastructure providers (including database, storage, and compute services).
                  All data is encrypted at rest and in transit. We select infrastructure providers that offer data residency
                  options for Canadian campaigns.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Data Retention */}
          <section id="data-retention">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">5. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We retain data for as long as your campaign account is active or as needed to provide services. Specific
              retention guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>Active campaign data:</strong> Retained for the duration of the active subscription plus a
                90-day grace period following account cancellation or expiry.
              </li>
              <li>
                <strong>Financial &amp; donation records:</strong> Retained for a minimum of seven (7) years in accordance
                with Elections Canada financial reporting requirements and the <em>Canada Elections Act</em>. Provincial
                campaign finance data is retained to comply with applicable provincial elections legislation (e.g.,
                Ontario&rsquo;s <em>Election Finances Act</em>, British Columbia&rsquo;s <em>Election Act</em>).
              </li>
              <li>
                <strong>Audit logs &amp; security records:</strong> Retained for up to two (2) years for security
                investigation and compliance purposes.
              </li>
              <li>
                <strong>Account deletion:</strong> Upon written request, account data may be permanently deleted subject
                to legal hold obligations. Financial records required under elections law cannot be deleted until
                the retention period expires.
              </li>
              <li>
                <strong>Backups:</strong> Encrypted database backups may retain data for up to 30 days beyond a deletion
                request before being purged from backup systems.
              </li>
            </ul>
          </section>

          {/* 6. Political Data */}
          <section id="political-data">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">6. Political &amp; Campaign Data</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Poll City is built exclusively for political campaign management. Political opinions, support levels, and
              voting likelihood data are sensitive personal information. We handle this data with heightened care:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>Campaign ownership:</strong> All voter contact data, canvassing records, and political affiliation
                data entered into Poll City belongs to the campaign, not to Poll City. We process this data as a service
                provider (data processor), acting on the campaign&rsquo;s instructions.
              </li>
              <li>
                <strong>No cross-campaign sharing:</strong> Data from one campaign is never shared with, visible to, or
                accessible by any other campaign on the platform, regardless of party affiliation.
              </li>
              <li>
                <strong>No political advertising use:</strong> Poll City does not use voter contact data for advertising,
                data brokering, or any purpose other than delivering the contracted campaign management services.
              </li>
              <li>
                <strong>Compliance with elections law:</strong> Campaigns using Poll City are responsible for ensuring
                their data collection and outreach activities comply with applicable federal and provincial elections
                legislation, including the <em>Canada Elections Act</em> and provincial equivalents, as well as CASL
                (Canada&rsquo;s Anti-Spam Legislation).
              </li>
            </ul>
          </section>

          {/* 7. User Rights */}
          <section id="user-rights">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">7. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Depending on your jurisdiction, you may have the following rights with respect to your personal data:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention obligations.</li>
              <li><strong>Data portability:</strong> Request an export of your campaign data in a machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing of your personal data in certain circumstances.</li>
              <li><strong>Withdraw consent:</strong> Where processing is based on consent, you may withdraw consent at any time.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:support@poll.city" className="text-blue-600 hover:underline">support@poll.city</a>.
              We will respond to requests within 30 days. Note that voter contact records entered by a campaign are
              owned by that campaign; individuals seeking access to or deletion of records held by a campaign should
              contact the campaign directly.
            </p>
          </section>

          {/* 8. Security */}
          <section id="security">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">8. Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
              <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>Passwords are hashed using bcrypt — plaintext passwords are never stored</li>
              <li>Two-factor authentication (2FA) is available and encouraged for all accounts</li>
              <li>Role-based access controls limit data access to authorized users only</li>
              <li>Security audit logs are maintained and monitored</li>
              <li>Regular security reviews and vulnerability assessments are conducted</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              While we take all reasonable precautions, no system is perfectly secure. In the event of a data breach
              affecting your personal information, we will notify affected campaigns and, where required, applicable
              regulatory bodies in accordance with Canadian breach notification requirements under PIPEDA and applicable
              provincial privacy legislation.
            </p>
          </section>

          {/* 9. Contact */}
          <section id="contact">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">9. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions, concerns, or requests regarding this Privacy Policy or the handling of your personal
              data, please contact us:
            </p>
            <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Poll City Privacy Office</p>
              <p>Email: <a href="mailto:support@poll.city" className="text-blue-600 hover:underline">support@poll.city</a></p>
              <p className="mt-2 text-sm text-gray-500">
                Governing Law: This Privacy Policy is governed by the laws of the Province of Ontario and the federal
                laws of Canada applicable therein, including the <em>Personal Information Protection and Electronic
                Documents Act</em> (PIPEDA) and Ontario&rsquo;s <em>Freedom of Information and Protection of Privacy Act</em> (FIPPA)
                where applicable.
              </p>
            </div>
            <p className="text-gray-600 text-sm mt-5">
              We may update this Privacy Policy from time to time. Material changes will be communicated to account
              holders via email or in-app notification. Your continued use of Poll City after changes take effect
              constitutes acceptance of the updated policy.
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} Poll City. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors font-medium text-gray-700">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
            <a href="mailto:support@poll.city" className="hover:text-gray-700 transition-colors">support@poll.city</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
