"use client";

import { useState } from "react";
import {
  Map, Layers, Compass, GitBranch, BarChart2, Calculator, BookOpen,
} from "lucide-react";
import MapWrapper from "./map/map-wrapper";
import LayersClient from "./layers/layers-client";
import AtlasImportClient from "./import/atlas-import-client";
import AtlasComingSoon from "./coming-soon";

const tabs = [
  { id: "map",          label: "Ontario Map",       icon: Map        },
  { id: "command",      label: "Atlas Command",     icon: Compass    },
  { id: "layers",       label: "Map Layers",        icon: Layers     },
  { id: "boundaries",   label: "Boundaries",        icon: GitBranch  },
  { id: "results",      label: "Historical Results",icon: BarChart2  },
  { id: "calculator",   label: "Swing Calculator",  icon: Calculator },
  { id: "demographics", label: "Demographics",      icon: BookOpen   },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AtlasTabsClient({ campaignId }: { campaignId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("map");

  return (
    <div className="flex flex-col h-screen bg-[#060E1A]">
      <div className="border-b border-slate-800 px-4 flex-shrink-0 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-cyan-500 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {activeTab === "map"          && <MapWrapper />}
        {activeTab === "command"      && <AtlasImportClient campaignId={campaignId} />}
        {activeTab === "layers"       && <LayersClient />}
        {activeTab === "boundaries"   && (
          <AtlasComingSoon
            title="Boundary Manager"
            description="Upload and manage riding boundary GeoJSON files, define ward polygons, and overlay electoral district boundaries on your canvassing maps."
          />
        )}
        {activeTab === "results"      && (
          <AtlasComingSoon
            title="Historical Results"
            description="Import and visualize past federal, provincial, and municipal election results. Identify swing polls, safe zones, and high-priority districts in your riding."
          />
        )}
        {activeTab === "calculator"   && (
          <AtlasComingSoon
            title="Swing Calculator"
            description="Model electoral scenarios: apply uniform swing, regional adjustments, and third-party vote splits to forecast your path to victory in every poll division."
          />
        )}
        {activeTab === "demographics" && (
          <AtlasComingSoon
            title="Demographics"
            description="Explore Statistics Canada census data overlaid on your riding. View median income, language profiles, renter vs. owner rates, and immigration patterns at the dissemination area level."
          />
        )}
      </div>
    </div>
  );
}
