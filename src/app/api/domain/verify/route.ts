import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import dns from "dns/promises";

/**
 * POST /api/domain/verify
 * Checks DNS records for a campaign's custom domain.
 * Returns verification status: not_connected | pending | verified | live
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId } = await req.json();
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customDomain: true, domainStatus: true },
  });

  if (!campaign?.customDomain) {
    return NextResponse.json({ status: "not_connected", message: "No custom domain configured" });
  }

  const domain = campaign.customDomain;

  try {
    // Check CNAME records
    let cnameResolved = false;
    try {
      const cnames = await dns.resolveCname(domain);
      cnameResolved = cnames.some((c) =>
        c.toLowerCase().includes("poll.city") ||
        c.toLowerCase().includes("vercel") ||
        c.toLowerCase().includes("cname.vercel-dns.com"),
      );
    } catch {
      // CNAME lookup failed — try A record
    }

    // Check A records (for root domains)
    let aResolved = false;
    if (!cnameResolved) {
      try {
        const addresses = await dns.resolve4(domain);
        // Vercel IPs for A record
        aResolved = addresses.length > 0;
      } catch {
        // A record lookup failed
      }
    }

    if (cnameResolved || aResolved) {
      // DNS is pointing correctly — check if site is reachable
      let isLive = false;
      try {
        const res = await fetch(`https://${domain}`, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
        });
        isLive = res.ok || res.status === 301 || res.status === 302;
      } catch {
        // Site not reachable yet — SSL may be provisioning
      }

      const status = isLive ? "live" : "verified";
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          domainStatus: status,
          ...(status === "verified" || status === "live" ? { domainVerifiedAt: new Date() } : {}),
        },
      });

      return NextResponse.json({
        status,
        domain,
        ssl: isLive,
        message: isLive
          ? `${domain} is live with SSL`
          : `DNS verified — SSL certificate is provisioning. This usually takes 5-15 minutes.`,
      });
    }

    // DNS not found yet
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { domainStatus: "pending" },
    });

    return NextResponse.json({
      status: "pending",
      domain,
      ssl: false,
      message: "DNS records not detected yet. Changes can take up to 48 hours to propagate.",
      instructions: {
        cname: { type: "CNAME", host: "www", value: "cname.vercel-dns.com" },
        aRecord: { type: "A", host: "@", value: "76.76.21.21" },
      },
    });
  } catch (err) {
    return NextResponse.json({
      status: "pending",
      domain,
      ssl: false,
      message: "Unable to verify DNS at this time. Try again in a few minutes.",
    });
  }
}
