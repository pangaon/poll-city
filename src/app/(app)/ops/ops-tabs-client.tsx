"use client";

import { useState } from "react";
import { LayoutDashboard, Brain, Globe, Database, Store, Users2 } from "lucide-react";
import OpsClient from "./ops-client";
import AdoniTrainerClient from "./adoni/adoni-trainer-client";
import SocialOpsClient from "./social/social-ops-client";
import SourceLibraryClient from "./sources/source-library-client";
import VendorsOpsClient from "./vendors/vendors-ops-client";
import CandidatesOpsClient from "./candidates/candidates-ops-client";

const tabs = [
  { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { id: "candidates", label: "Candidates",     icon: Users2           },
  { id: "adoni",      label: "Adoni Training", icon: Brain            },
  { id: "social",     label: "Social",         icon: Globe            },
  { id: "sources",    label: "Source Library", icon: Database         },
  { id: "vendors",    label: "Vendor Network", icon: Store            },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function OpsTabsClient() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-[#0A2342] text-[#0A2342]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1">
        {activeTab === "dashboard"  && <OpsClient />}
        {activeTab === "candidates" && <CandidatesOpsClient />}
        {activeTab === "adoni"      && <AdoniTrainerClient />}
        {activeTab === "social"     && <SocialOpsClient />}
        {activeTab === "sources"    && <SourceLibraryClient />}
        {activeTab === "vendors"    && <VendorsOpsClient />}
      </div>
    </div>
  );
}
