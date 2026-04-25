"use client";

import { useState } from "react";
import { Vote, Camera, Trophy } from "lucide-react";
import EdayClient from "./eday-client";
import CaptureTabWrapper from "./capture/capture-tab-wrapper";
import HQClient from "./hq/hq-client";

const tabs = [
  { id: "eday",    label: "Election Day",       icon: Vote   },
  { id: "capture", label: "Quick Capture",      icon: Camera },
  { id: "hq",      label: "Election Night HQ",  icon: Trophy },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function EdayTabsClient({
  campaignId,
  isManager,
}: {
  campaignId: string;
  isManager: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("eday");

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
        {activeTab === "eday"    && <EdayClient campaignId={campaignId} isManager={isManager} />}
        {activeTab === "capture" && <CaptureTabWrapper campaignId={campaignId} />}
        {activeTab === "hq"      && <HQClient campaignId={campaignId} />}
      </div>
    </div>
  );
}
