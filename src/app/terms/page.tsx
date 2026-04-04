export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-600 mb-8">Last updated: April 4, 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Poll City, you accept and agree to be bound by the terms
            and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use Poll City for personal, non-commercial
            transitory viewing only. This is the grant of a license, not a transfer of title,
            and under this license you may not:
          </p>
          <ul>
            <li>modify or copy the materials</li>
            <li>use the materials for any commercial purpose</li>
            <li>attempt to decompile or reverse engineer any software</li>
          </ul>

          <h2>3. Service Availability</h2>
          <p>
            We strive to keep Poll City available 24/7, but we do not guarantee uninterrupted
            or error-free operation of the service.
          </p>

          <h2>4. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account.
          </p>

          <h2>5. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability,
            for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2>6. Contact Information</h2>
          <p>
            Questions about the Terms of Service should be sent to us at legal@pollcity.com.
          </p>
        </div>
      </div>
    </div>
  );
}