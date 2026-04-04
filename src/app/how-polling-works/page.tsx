import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileCheck, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "How Polling Works — Poll City",
  description: "Learn how Poll City keeps your vote anonymous and verifiable using cryptographic hashing.",
};

const STEPS = [
  {
    icon: ShieldCheck,
    title: "You vote",
    description: "You answer a poll question on Poll City. Your choice is recorded.",
  },
  {
    icon: Lock,
    title: "Your identity is hashed",
    description:
      "Your vote is converted into a mathematical hash using SHA-256 — the same algorithm used in banking. This hash proves you voted, but cannot be reversed to reveal who you are.",
  },
  {
    icon: Eye,
    title: "Only the hash is stored",
    description:
      "Poll City stores only the one-way hash — never your name, email, or user ID alongside your vote. The hash prevents you from voting twice, but nobody can trace it back to you.",
  },
  {
    icon: FileCheck,
    title: "You receive a receipt",
    description:
      "After voting, you receive a unique receipt code. You can use this code at any time to verify your vote was counted — without revealing which option you chose.",
  },
];

const FAQ = [
  {
    q: "Can the campaign see how I voted?",
    a: "No. Campaigns see only aggregate results — total counts per option. Your individual vote is never linked to your identity.",
  },
  {
    q: "Can Poll City see how I voted?",
    a: "No. Poll City stores a one-way hash, not your identity. Even Poll City engineers cannot reverse the hash to determine how you voted.",
  },
  {
    q: "Can anyone trace my vote back to me?",
    a: "No. The SHA-256 hash is mathematically irreversible. Given the hash, there is no computation that can recover your identity.",
  },
  {
    q: "How do I know my vote was counted?",
    a: "After voting, you receive a receipt code. Enter it at /verify-vote to confirm your vote is in the count. The receipt proves inclusion without revealing your choice.",
  },
  {
    q: "What if I lose my receipt code?",
    a: "Your receipt code is stored in your browser's local storage. If you clear your browser data, the code is lost — but your vote remains counted.",
  },
  {
    q: "What stops someone from voting twice?",
    a: "The vote hash. Each voter produces a unique hash per poll. If you try to vote again, the system recognises the hash already exists and blocks the duplicate.",
  },
];

export default function HowPollingWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-blue-200" />
          <h1 className="text-4xl font-bold mb-4">Your Vote Is Anonymous</h1>
          <p className="text-xl text-blue-100">
            Here is exactly how Poll City protects your privacy — step by step.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <step.icon className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Step {i + 1}: {step.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Technical explanation */}
        <div className="mt-12 bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Technical Details</h2>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              <strong>Hashing algorithm:</strong> SHA-256 (Secure Hash Algorithm 256-bit), the same
              algorithm used in TLS certificates, Bitcoin, and government digital signatures.
            </p>
            <p>
              <strong>Vote hash formula:</strong>{" "}
              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                SHA-256(&quot;vote:&quot; + pollId + &quot;:&quot; + voterId + &quot;:&quot; + serverSalt)
              </code>
              <br />
              The server salt is a secret value that ensures hashes cannot be brute-forced even if the
              poll ID and voter ID are known.
            </p>
            <p>
              <strong>Receipt verification:</strong> Your receipt code is hashed with SHA-256 and
              stored. When you verify, the system hashes your receipt code again and checks for a
              match. This confirms your vote exists without revealing what it was.
            </p>
            <p>
              <strong>Data stored per vote:</strong> poll ID, option ID (or value), vote hash,
              receipt hash, anonymous geographic aggregate (postal code prefix only). No user ID, no
              session ID, no email, no name.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verify CTA */}
        <div className="mt-12 text-center bg-blue-50 border border-blue-200 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-blue-900 mb-2">Have a receipt code?</h2>
          <p className="text-blue-700 mb-4">Verify your vote was counted.</p>
          <Link
            href="/verify-vote"
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <FileCheck className="w-5 h-5" />
            Verify My Vote
          </Link>
        </div>
      </div>
    </div>
  );
}
