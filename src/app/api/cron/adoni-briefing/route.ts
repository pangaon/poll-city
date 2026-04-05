import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily 07:00 briefing email to campaign admins.
// Pulls same-day stats, asks Anthropic for a personalised priority.

interface Stats {
  contacts: number;
  supporters: number;
  volunteers: number;
  donations: number;
  doorsYesterday: number;
  daysToElection: number | null;
}

async function computeStats(campaignId: string, electionDate: Date | null): Promise<Stats> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [contacts, supporters, volunteers, donations, doorsYesterday] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as never[] } },
    }),
    prisma.volunteerProfile.count({ where: { campaignId } }),
    prisma.donation.count({ where: { campaignId } }),
    prisma.interaction.count({
      where: {
        contact: { campaignId },
        type: "door_knock" as never,
        createdAt: { gte: yesterday },
      },
    }),
  ]);
  const daysToElection = electionDate
    ? Math.max(0, Math.ceil((electionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  return { contacts, supporters, volunteers, donations, doorsYesterday, daysToElection };
}

async function generatePriority(campaignName: string, stats: Stats): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const lines: string[] = [];
    if (stats.daysToElection !== null && stats.daysToElection <= 14) {
      lines.push(`${stats.daysToElection} days to election — accelerate GOTV calls.`);
    }
    if (stats.doorsYesterday < 20) lines.push("Doors knocked yesterday is low — schedule a canvass.");
    if (stats.supporters / Math.max(1, stats.contacts) < 0.25) {
      lines.push("Supporter identification is under 25% — push ID'ing in calls today.");
    }
    return lines.join(" ") || "Solid day yesterday — keep the pace up.";
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are Adoni, a warm, direct Canadian campaign advisor. Write one short daily priority (3-4 sentences max) for the ${campaignName} campaign. Stats: ${stats.contacts} contacts, ${stats.supporters} supporters, ${stats.volunteers} volunteers, ${stats.donations} donations logged, ${stats.doorsYesterday} doors knocked yesterday, ${stats.daysToElection ?? "?"} days to election. Be specific. No preamble.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? "Keep pushing today.";
  } catch (e) {
    console.error("[adoni-briefing] anthropic call failed:", e);
    return "Keep pushing today.";
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      electionDate: true,
      memberships: {
        where: { role: { in: ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"] } },
        take: 3,
        select: { user: { select: { email: true, name: true } } },
      },
      _count: { select: { contacts: true } },
    },
  });

  let briefed = 0;
  let skipped = 0;

  for (const c of campaigns) {
    if (c._count.contacts < 10) {
      skipped += 1;
      continue;
    }
    const stats = await computeStats(c.id, c.electionDate);
    const priority = await generatePriority(c.name, stats);

    for (const m of c.memberships) {
      if (!m.user.email) continue;
      if (!process.env.RESEND_API_KEY) {
        console.log(`[adoni-briefing] would email ${m.user.email}: ${priority}`);
        continue;
      }
      try {
        await sendEmail({
          to: m.user.email,
          subject: `📊 Your Daily Campaign Brief — ${stats.daysToElection ?? "?"} days to election`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h1 style="color:#1E3A8A;font-size:22px;margin-bottom:8px;">Good morning, ${m.user.name ?? "there"}</h1>
            <p style="color:#64748b;">${c.name} · ${stats.daysToElection ?? "?"} days to election</p>
            <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:0;font-weight:600;color:#1e3a8a;">Today's priority</p>
              <p style="margin:8px 0 0;">${priority}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <tr><td style="padding:6px 0;color:#64748b;">Contacts</td><td style="text-align:right;font-weight:600;">${stats.contacts.toLocaleString()}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Supporters</td><td style="text-align:right;font-weight:600;">${stats.supporters.toLocaleString()}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Volunteers</td><td style="text-align:right;font-weight:600;">${stats.volunteers.toLocaleString()}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Doors yesterday</td><td style="text-align:right;font-weight:600;">${stats.doorsYesterday}</td></tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">— Adoni, your Poll City campaign advisor</p>
          </div>`,
        });
      } catch (e) {
        console.error(`[adoni-briefing] send failed for ${m.user.email}:`, e);
      }
    }
    briefed += 1;
  }

  return NextResponse.json({ ok: true, briefed, skipped });
}
