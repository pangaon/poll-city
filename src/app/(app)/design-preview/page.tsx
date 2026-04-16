import Link from "next/link";
import { ExternalLink, CheckCircle2, Clock } from "lucide-react";

const SCREENS = [
  // App screens
  { name: "Dashboard", path: "/design-preview/app/dashboard", category: "App", status: "done" },
  { name: "Contacts", path: "/design-preview/app/contacts", category: "App", status: "done" },
  { name: "Canvassing", path: "/design-preview/app/canvassing", category: "App", status: "done" },
  { name: "Walk List", path: "/design-preview/app/walk-list", category: "App", status: "done" },
  { name: "Lit Drops", path: "/design-preview/app/lit-drops", category: "App", status: "done" },
  { name: "Field Ops", path: "/design-preview/app/field-ops", category: "App", status: "done" },
  { name: "Signs", path: "/design-preview/app/signs", category: "App", status: "done" },
  { name: "Volunteers", path: "/design-preview/app/volunteers", category: "App", status: "done" },
  { name: "Donations", path: "/design-preview/app/donations", category: "App", status: "done" },
  { name: "Communications", path: "/design-preview/app/communications", category: "App", status: "done" },
  { name: "Polling", path: "/design-preview/app/polling", category: "App", status: "done" },
  { name: "Calendar", path: "/design-preview/app/calendar", category: "App", status: "done" },
  { name: "Tasks", path: "/design-preview/app/tasks", category: "App", status: "done" },
  { name: "Media", path: "/design-preview/app/media", category: "App", status: "done" },
  { name: "Reports", path: "/design-preview/app/reports", category: "App", status: "done" },
  { name: "Print", path: "/design-preview/app/print", category: "App", status: "done" },
  { name: "Settings", path: "/design-preview/app/settings", category: "App", status: "done" },
  { name: "Admin", path: "/design-preview/app/admin", category: "App", status: "done" },
  { name: "Candidate", path: "/design-preview/app/candidate", category: "App", status: "done" },
  { name: "Elected Officials", path: "/design-preview/app/officials", category: "App", status: "done" },
  // Social screens
  { name: "Social Feed", path: "/design-preview/social/feed", category: "Social", status: "done" },
  { name: "Trending", path: "/design-preview/social/trending", category: "Social", status: "done" },
  { name: "Create Signal", path: "/design-preview/social/create", category: "Social", status: "done" },
  { name: "Command", path: "/design-preview/social/command", category: "Social", status: "done" },
  { name: "Notifications", path: "/design-preview/social/notifications", category: "Social", status: "done" },
  { name: "Profile", path: "/design-preview/social/profile", category: "Social", status: "done" },
  // Marketing
  { name: "Marketing Home", path: "/design-preview/marketing/home", category: "Marketing", status: "done" },
];

const CATEGORY_COLORS: Record<string, string> = {
  App: "#2979FF",
  Social: "#FF3B30",
  Marketing: "#FFD600",
};

export default function DesignPreviewIndex() {
  const done = SCREENS.filter(s => s.status === "done").length;

  return (
    <div className="min-h-screen bg-[#050A1F] text-[#F5F7FF] font-sans p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00E5FF] mb-3">SUPER ADMIN ONLY</div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#F5F7FF] mb-2">Design Preview</h1>
          <p className="text-[#AAB2FF] text-sm">
            {done} of {SCREENS.length} screens complete
          </p>
          <div className="mt-4 w-full h-1.5 bg-[#0F1440] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2979FF] to-[#00E5FF] rounded-full transition-all"
              style={{ width: `${(done / SCREENS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0F1440]">
              <tr>
                {["Screen", "Category", "Status", ""].map((h, i) => (
                  <th key={i} className="py-3 px-5 text-[10px] font-black text-[#AAB2FF] uppercase tracking-[0.2em] border-b border-[#2979FF]/20">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2979FF]/10">
              {SCREENS.map((screen) => (
                <tr key={screen.path} className="group hover:bg-[#2979FF]/5 transition-all">
                  <td className="py-3 px-5 font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors">
                    {screen.name}
                  </td>
                  <td className="py-3 px-5">
                    <span
                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border"
                      style={{
                        color: CATEGORY_COLORS[screen.category],
                        borderColor: `${CATEGORY_COLORS[screen.category]}40`,
                        backgroundColor: `${CATEGORY_COLORS[screen.category]}10`,
                      }}
                    >
                      {screen.category}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    {screen.status === "done" ? (
                      <div className="flex items-center gap-1.5 text-[#00C853] text-[11px] font-bold">
                        <CheckCircle2 size={14} /> Done
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#FFD600] text-[11px] font-bold">
                        <Clock size={14} /> Pending
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    {screen.status === "done" && (
                      <Link
                        href={screen.path}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#2979FF] hover:text-[#00E5FF] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        View <ExternalLink size={12} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
