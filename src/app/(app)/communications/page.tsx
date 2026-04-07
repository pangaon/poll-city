import Link from "next/link";
import { Mail, MessageSquare, Share2, Inbox, Megaphone } from "lucide-react";

export const metadata = { title: "Communications -- Poll City" };

const HUBS = [
  { href: "/communications/email", icon: Mail, label: "Email", desc: "CASL-compliant campaign email with templates and targeting" },
  { href: "/communications/sms", icon: MessageSquare, label: "SMS & Text", desc: "CRTC-compliant text blasts with time-window enforcement" },
  { href: "/communications/social", icon: Share2, label: "Social Media", desc: "Post composer, approval workflow, mentions feed" },
  { href: "/communications/inbox", icon: Inbox, label: "Unified Inbox", desc: "All channels -- email, SMS, questions, mentions -- in one view" },
  { href: "/communications/advertising", icon: Megaphone, label: "Advertising", desc: "Meta + Google political ads" },
];

export default function CommunicationsHubPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0A2342]">Communications</h1>
        <p className="text-sm text-slate-600 mt-1">Reach voters. Stay compliant. Measure everything.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {HUBS.map((h) => {
          const Icon = h.icon;
          return (
            <Link
              key={h.href}
              href={h.href}
              className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow min-h-[44px]"
            >
              <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-[#1D9E75]" />
              </div>
              <h2 className="font-bold text-[#0A2342]">{h.label}</h2>
              <p className="text-sm text-slate-600 mt-1">{h.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
