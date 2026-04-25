"use client";

import { useState } from "react";
import { CalendarDays, Mic2 } from "lucide-react";
import CalendarClient from "./calendar-client";
import CandidateScheduleClient from "./candidate/candidate-schedule-client";

const tabs = [
  { id: "calendar",  label: "Calendar",          icon: CalendarDays },
  { id: "candidate", label: "Candidate Schedule", icon: Mic2         },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function CalendarTabsClient({ campaignId }: { campaignId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("calendar");

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
        {activeTab === "calendar"  && <CalendarClient campaignId={campaignId} />}
        {activeTab === "candidate" && <CandidateScheduleClient campaignId={campaignId} />}
      </div>
    </div>
  );
}
