import React from "react";
import { createBrowserRouter } from "react-router";

// Layouts
import { MarketingLayout, Home } from "./pages/Marketing/Home";
import { AppLayout } from "./pages/App/AppLayout";
import { Dashboard } from "./pages/App/Dashboard";
import { Contacts } from "./pages/App/Contacts";
import { Canvassing } from "./pages/App/Canvassing";
import { Communications } from "./pages/App/Communications";
import { Polling } from "./pages/App/Polling";
import { Admin } from "./pages/App/Admin";
import { Calendar } from "./pages/App/Calendar";
import { Tasks } from "./pages/App/Tasks";
import { Volunteers } from "./pages/App/Volunteers";
import { Donations } from "./pages/App/Donations";
import { Signs } from "./pages/App/Signs";
import { Print } from "./pages/App/Print";
import { Media } from "./pages/App/Media";
import { Reports } from "./pages/App/Reports";
import { Settings } from "./pages/App/Settings";
import { FieldOps } from "./pages/App/FieldOps";
import { WalkList } from "./pages/App/WalkList";
import { LitDrops } from "./pages/App/LitDrops";
import { Candidate } from "./pages/App/Candidate";
import { ElectedOfficials } from "./pages/App/ElectedOfficials";
import { SocialLayout } from "./pages/Social/SocialLayout";
import { SocialFeed } from "./pages/Social/SocialFeed";
import { SocialTrending } from "./pages/Social/SocialTrending";
import { SocialCreate } from "./pages/Social/SocialCreate";
import { SocialNotifications } from "./pages/Social/SocialNotifications";
import { SocialProfile } from "./pages/Social/SocialProfile";
import { SocialCommand } from "./pages/Social/SocialCommand";

// Placeholder for unbuilt pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex h-full items-center justify-center text-slate-400 font-medium">
    {title} Module under construction...
  </div>
);

export const router = createBrowserRouter([
  // 1. Marketing Website
  {
    path: "/",
    Component: MarketingLayout,
    children: [
      { index: true, Component: Home },
    ],
  },
  // 2. SaaS App (Command Center)
  {
    path: "/app",
    Component: AppLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "contacts", Component: Contacts },
      { path: "canvassing", Component: Canvassing },
      { path: "field-ops", Component: FieldOps },
      { path: "walk-list", Component: WalkList },
      { path: "lit-drops", Component: LitDrops },
      { path: "polling", Component: Polling },
      { path: "communications", Component: Communications },
      { path: "calendar", Component: Calendar },
      { path: "tasks", Component: Tasks },
      { path: "volunteers", Component: Volunteers },
      { path: "donations", Component: Donations },
      { path: "signs", Component: Signs },
      { path: "print", Component: Print },
      { path: "media", Component: Media },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
      { path: "admin", Component: Admin },
      { path: "candidate", Component: Candidate },
      { path: "officials", Component: ElectedOfficials },
    ],
  },
  // 3. Poll City Social (Public Mobile App)
  {
    path: "/social",
    Component: SocialLayout,
    children: [
      { index: true, Component: SocialFeed },
      { path: "trending", Component: SocialTrending },
      { path: "create", Component: SocialCreate },
      { path: "command", Component: SocialCommand },
      { path: "notifications", Component: SocialNotifications },
      { path: "profile", Component: SocialProfile },
    ],
  }
]);