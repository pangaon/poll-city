import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Poll City",
  description: "Terms of Service for Poll City — the campaign management platform for Canadian political campaigns.",
};

const sections = [
  { id: "what-is-poll-city", label: "What Is Poll City" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "prohibited-uses", label: "Prohibited Uses" },
  { id: "data-ownership", label: "Data Ownership" },
  { id: "service-availability", label: "Service Availability" },
  { id: "payment-terms", label: "Payment & Subscription" },
  { id: "termination", label: "Account Termination" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact Us" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-700 hover:text-blue-800 transition-colors">
            <span className="text-xl">🗳️</span>
            Poll City
          </Link>
          <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Privacy Policy →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500">Effective date: April 2026 &nbsp;·&nbsp; Governing law: Ontario, Canada</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Poll City (&ldquo;Service,&rdquo; &ldquo;Platform,&rdquo;
            &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). By creating an account or using the Service, you agree to be bound by these Terms.
            If you do not agree, do not use Poll City.
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

          {/* 1. What Is Poll City */}
          <section id="what-is-poll-city">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">1. What Is Poll City</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Poll City is a Software-as-a-Service (SaaS) platform designed for use by political campaigns, political
              parties, electoral district associations (EDAs), and related political organizations operating in Canada.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              The platform provides tools for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
              <li>Voter contact management and canvassing coordination</li>
              <li>GOTV (Get Out The Vote) planning and execution</li>
              <li>Volunteer recruitment, scheduling, and management</li>
              <li>Campaign communications (email, SMS, social media)</li>
              <li>Donations tracking and campaign finance reporting</li>
              <li>Events management, polling, and analytics</li>
              <li>AI-powered campaign assistant (Adoni)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Poll City provides the platform and infrastructure. The campaign is responsible for how it uses these
              tools and the content it creates, sends, and manages.
            </p>
          </section>

          {/* 2. Acceptable Use */}
          <section id="acceptable-use">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">2. Acceptable Use</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Poll City is intended exclusively for use by legitimate political campaigns and political organizations.
              Authorized uses include:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
              <li>Managing voter contact lists and canvassing activities for a registered or recognized political campaign</li>
              <li>Organizing volunteers and coordinating campaign field operations</li>
              <li>Sending campaign communications to supporters who have consented to receive them in compliance with CASL</li>
              <li>Tracking donations and generating reports for required Elections Canada or provincial filings</li>
              <li>Using the Adoni AI assistant for campaign planning, drafting, and analysis</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              You are responsible for ensuring that all campaign activities conducted through Poll City comply with
              applicable federal and provincial elections laws, including the <em>Canada Elections Act</em>, applicable
              provincial elections legislation, and Canada&rsquo;s Anti-Spam Legislation (CASL).
            </p>
          </section>

          {/* 3. Prohibited Uses */}
          <section id="prohibited-uses">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">3. Prohibited Uses</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              The following uses of Poll City are strictly prohibited and may result in immediate account suspension
              or termination:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>Spam and unsolicited communications:</strong> Sending bulk email or SMS messages to individuals
                who have not consented to receive them, in violation of CASL or applicable law.
              </li>
              <li>
                <strong>Voter suppression:</strong> Using the platform to intimidate voters, spread disinformation
                about voting procedures, or engage in any activity designed to prevent eligible voters from exercising
                their right to vote.
              </li>
              <li>
                <strong>Illegal activities:</strong> Using Poll City in connection with any activity that violates
                federal or provincial law, including elections finance violations, unauthorized collection of personal data,
                or electoral fraud.
              </li>
              <li>
                <strong>Impersonation:</strong> Misrepresenting your identity, campaign affiliation, or political
                party when creating or using an account.
              </li>
              <li>
                <strong>Data misuse:</strong> Selling, transferring, or sharing voter contact data obtained through Poll
                City to third parties for commercial, non-campaign purposes.
              </li>
              <li>
                <strong>Platform abuse:</strong> Attempting to reverse-engineer, scrape, hack, disrupt, or overload
                the Poll City platform or its infrastructure.
              </li>
              <li>
                <strong>Non-political commercial use:</strong> Using Poll City as a general-purpose CRM, marketing
                platform, or business tool unrelated to a political campaign or organization.
              </li>
              <li>
                <strong>Foreign interference:</strong> Using Poll City on behalf of, or funded by, foreign principals
                to interfere in Canadian elections, in violation of the <em>Canada Elections Act</em>.
              </li>
            </ul>
          </section>

          {/* 4. Data Ownership */}
          <section id="data-ownership">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">4. Data Ownership</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Your data belongs to your campaign.</strong> All voter contact records, canvassing data,
              volunteer information, donation records, and other campaign content you enter into Poll City remains
              your property. Poll City does not claim ownership of campaign data.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Poll City acts as a <strong>data processor</strong> — we process and store your data solely for the
              purpose of providing the platform services you have contracted for. We do not sell, rent, or use
              your campaign data for any other purpose.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              You grant Poll City a limited, non-exclusive licence to store, process, and transmit your data as
              necessary to operate the platform and deliver the services described in your subscription.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You can export your data at any time using the Import / Export feature. Upon account termination,
              you have 90 days to export your data before it is deleted from active systems (subject to legal
              retention requirements for financial records).
            </p>
          </section>

          {/* 5. Service Availability */}
          <section id="service-availability">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">5. Service Availability</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We target 99% platform uptime on a monthly basis, excluding scheduled maintenance windows. We will
              make reasonable efforts to schedule maintenance during low-usage periods and will provide advance
              notice where possible.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>No guarantee:</strong> We do not guarantee uninterrupted, error-free, or perfectly secure
              operation of the Service. Poll City is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; Service may be affected
              by factors outside our control, including internet connectivity, third-party provider outages, or
              force majeure events.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are not liable for any loss, damages, or missed campaign opportunities resulting from service
              unavailability. We strongly recommend campaigns maintain offline copies of critical data,
              particularly in the final days before an election.
            </p>
          </section>

          {/* 6. Payment Terms */}
          <section id="payment-terms">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">6. Payment &amp; Subscription</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>Subscription model:</strong> Access to paid features requires an active subscription.
                Subscription fees are billed monthly or annually as selected at sign-up.
              </li>
              <li>
                <strong>Billing:</strong> Subscriptions auto-renew at the end of each billing period unless cancelled
                prior to renewal. You authorize Poll City to charge your payment method on file for all subscription fees.
              </li>
              <li>
                <strong>Cancel anytime:</strong> You may cancel your subscription at any time. Cancellation takes effect
                at the end of the current billing period. There are no cancellation fees.
              </li>
              <li>
                <strong>Refunds:</strong> Subscription fees are generally non-refundable. We may issue refunds on a
                case-by-case basis at our sole discretion for documented service failures.
              </li>
              <li>
                <strong>Price changes:</strong> We may change subscription pricing with 30 days written notice to
                active subscribers. Continued use after the effective date constitutes acceptance of the new pricing.
              </li>
              <li>
                <strong>Taxes:</strong> Prices are in Canadian dollars (CAD) and exclude applicable federal and
                provincial taxes (HST/GST), which will be added at checkout where applicable.
              </li>
            </ul>
          </section>

          {/* 7. Termination */}
          <section id="termination">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">7. Account Termination</h2>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Termination by You</h3>
            <p className="text-gray-700 leading-relaxed">
              You may close your account at any time by contacting{" "}
              <a href="mailto:support@poll.city" className="text-blue-600 hover:underline">support@poll.city</a> or
              through your account settings. Export your data before requesting closure. Upon closure, your data
              will be retained for 90 days before deletion, subject to legal retention requirements.
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">Termination by Poll City</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We reserve the right to suspend or terminate your account immediately, without prior notice, if:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
              <li>You breach these Terms of Service</li>
              <li>You engage in prohibited uses as defined in Section 3</li>
              <li>Your account is used for unlawful activities or electoral fraud</li>
              <li>You fail to pay subscription fees and do not remedy the failure within 10 days of notice</li>
              <li>We are required to do so by law or court order</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              In cases of severe violation (voter suppression, foreign interference, electoral fraud), we reserve the
              right to report the activity to Elections Canada or applicable law enforcement authorities.
            </p>
          </section>

          {/* 8. Liability */}
          <section id="liability">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">8. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              To the maximum extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                Poll City shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
                including lost profits, lost data, or missed campaign outcomes, even if we have been advised of the
                possibility of such damages.
              </li>
              <li>
                Our total liability to you for any claim arising from or related to these Terms or the Service shall
                not exceed the total subscription fees paid by you in the three (3) months preceding the claim.
              </li>
              <li>
                The campaign is solely responsible for the accuracy of voter contact data, the legality of campaign
                communications, and compliance with elections law. Poll City is a tool and does not provide legal,
                electoral, or compliance advice.
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or
              any other liability that cannot be excluded by law.
            </p>
          </section>

          {/* 9. Governing Law */}
          <section id="governing-law">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">9. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              These Terms of Service are governed by and construed in accordance with the laws of the Province of
              Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Any disputes arising from or related to these Terms or the use of Poll City shall be subject to
              the exclusive jurisdiction of the courts of Ontario, Canada, and both parties consent to the personal
              jurisdiction of such courts.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We encourage you to contact us before initiating any legal proceedings. Many concerns can be resolved
              quickly through direct communication with our support team.
            </p>
          </section>

          {/* 10. Contact */}
          <section id="contact">
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">10. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about these Terms of Service should be directed to:
            </p>
            <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Poll City Legal</p>
              <p>Email: <a href="mailto:support@poll.city" className="text-blue-600 hover:underline">support@poll.city</a></p>
              <p className="mt-2 text-sm text-gray-500">
                We may update these Terms from time to time. Material changes will be communicated to account holders
                via email or in-app notification at least 14 days before taking effect. Your continued use of Poll City
                after changes take effect constitutes acceptance of the updated Terms.
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} Poll City. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors font-medium text-gray-700">Terms of Service</Link>
            <a href="mailto:support@poll.city" className="hover:text-gray-700 transition-colors">support@poll.city</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
