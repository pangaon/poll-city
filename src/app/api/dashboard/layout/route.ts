/**
 * Dashboard layout persistence — save/load widget positions per user per campaign.
 *
 * Every campaign manager wants their dashboard their way.
 * This API stores the complete widget layout: positions, sizes, visibility,
 * and which widgets are popped out to separate windows.
 *
 * GET — load saved layout (falls back to default)
 * PUT — save layout (called on every drag-drop or resize)
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  fullScreen: boolean;
  poppedOut: boolean;
  pinned: boolean;
}

interface DashboardLayout {
  widgets: WidgetLayout[];
  columns: number;
  theme: "light" | "dark" | "auto";
  density: "compact" | "comfortable" | "spacious";
}

const DEFAULT_LAYOUT: DashboardLayout = {
  columns: 12,
  theme: "light",
  density: "comfortable",
  widgets: [
    { id: "health-score", x: 0, y: 0, w: 3, h: 2, visible: true, fullScreen: false, poppedOut: false, pinned: true },
    { id: "the-gap", x: 3, y: 0, w: 6, h: 2, visible: true, fullScreen: false, poppedOut: false, pinned: true },
    { id: "quick-actions", x: 9, y: 0, w: 3, h: 2, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "map", x: 0, y: 2, w: 8, h: 4, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "activity-feed", x: 8, y: 2, w: 4, h: 4, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "leaderboard", x: 0, y: 6, w: 4, h: 3, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "support-funnel", x: 4, y: 6, w: 4, h: 3, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "priorities", x: 8, y: 6, w: 4, h: 3, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "canvassing-pace", x: 0, y: 9, w: 6, h: 2, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "upcoming-events", x: 6, y: 9, w: 3, h: 2, visible: true, fullScreen: false, poppedOut: false, pinned: false },
    { id: "overdue-tasks", x: 9, y: 9, w: 3, h: 2, visible: true, fullScreen: false, poppedOut: false, pinned: false },
  ],
};

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Verify membership — prevent cross-campaign access
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this campaign" }, { status: 403 });
  }

  // Try to load saved layout from campaign customization
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customization: true },
  });

  const custom = campaign?.customization as Record<string, unknown> | null;
  const userLayouts = (custom?.dashboardLayouts ?? {}) as Record<string, DashboardLayout>;
  const userLayout = userLayouts[session!.user.id];

  return NextResponse.json({
    layout: userLayout ?? DEFAULT_LAYOUT,
    isDefault: !userLayout,
    availableWidgets: [
      { id: "health-score", label: "Campaign Health", icon: "activity", category: "overview" },
      { id: "the-gap", label: "The Gap", icon: "target", category: "gotv" },
      { id: "quick-actions", label: "Quick Actions", icon: "zap", category: "overview" },
      { id: "map", label: "Campaign Map", icon: "map", category: "field" },
      { id: "activity-feed", label: "Live Activity", icon: "radio", category: "overview" },
      { id: "leaderboard", label: "Volunteer Leaderboard", icon: "trophy", category: "team" },
      { id: "support-funnel", label: "Support Funnel", icon: "filter", category: "analytics" },
      { id: "priorities", label: "Today's Priorities", icon: "list", category: "overview" },
      { id: "canvassing-pace", label: "Canvassing Pace", icon: "trending-up", category: "field" },
      { id: "upcoming-events", label: "Upcoming Events", icon: "calendar", category: "events" },
      { id: "overdue-tasks", label: "Overdue Tasks", icon: "alert-triangle", category: "tasks" },
      { id: "donation-tracker", label: "Donation Tracker", icon: "dollar-sign", category: "finance" },
      { id: "sign-map", label: "Sign Coverage", icon: "map-pin", category: "field" },
      { id: "election-countdown", label: "Election Countdown", icon: "clock", category: "overview" },
      { id: "p1-call-list", label: "P1 Call List", icon: "phone", category: "gotv" },
      { id: "rides-needed", label: "Rides Needed", icon: "car", category: "gotv" },
      { id: "red-flags", label: "Red Flags", icon: "alert-circle", category: "overview" },
    ],
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId, layout } = await req.json();
  if (!campaignId || !layout) return NextResponse.json({ error: "campaignId and layout required" }, { status: 400 });

  // Verify membership — prevent cross-campaign writes
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this campaign" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customization: true },
  });

  const existing = (campaign?.customization ?? {}) as Record<string, unknown>;
  const userLayouts = (existing.dashboardLayouts ?? {}) as Record<string, unknown>;
  userLayouts[session!.user.id] = layout;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { customization: { ...existing, dashboardLayouts: userLayouts } as object },
  });

  return NextResponse.json({ ok: true });
}
