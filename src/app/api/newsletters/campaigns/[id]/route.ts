/**
 * GET/PATCH/DELETE /api/newsletters/campaigns/[id] — Manage a newsletter campaign.
 * PATCH with status: "sending" triggers the actual send via Resend.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuthWithPermission(req, "email:read");
  if (error) return error;

  const newsletter = await prisma.newsletterCampaign.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ newsletter });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "email:write");
  if (error) return error;

  const newsletter = await prisma.newsletterCampaign.findUnique({ where: { id: params.id } });
  if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // If sending, do the actual send
  if (body.status === "sending" && newsletter.status !== "sent") {
    const cid = newsletter.campaignId ?? newsletter.officialId;
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: {
        ...(newsletter.campaignId ? { campaignId: newsletter.campaignId } : {}),
        ...(newsletter.officialId ? { officialId: newsletter.officialId } : {}),
        status: "active",
      },
      select: { email: true, firstName: true },
    });

    const resendKey = process.env.RESEND_API_KEY;
    let sentCount = 0;
    let bounceCount = 0;

    if (resendKey && subscribers.length > 0) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);

        // Send in batches of 50
        for (let i = 0; i < subscribers.length; i += 50) {
          const batch = subscribers.slice(i, i + 50);
          for (const sub of batch) {
            try {
              await resend.emails.send({
                from: "Poll City <noreply@pollcity.ca>",
                to: sub.email,
                subject: newsletter.subject,
                html: newsletter.body,
              });
              sentCount++;
            } catch {
              bounceCount++;
            }
          }
        }
      } catch (e) {
        console.error("[Newsletter Send]", e);
      }
    }

    await prisma.newsletterCampaign.update({
      where: { id: params.id },
      data: { status: "sent", sentAt: new Date(), sentCount, bounceCount },
    });

    return NextResponse.json({ ok: true, sentCount, bounceCount });
  }

  // Regular update
  const updates: Record<string, unknown> = {};
  if (body.subject !== undefined) updates.subject = body.subject.trim();
  if (body.body !== undefined) updates.body = body.body;
  if (body.scheduledFor !== undefined) updates.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  if (body.status !== undefined && ["draft", "scheduled"].includes(body.status)) updates.status = body.status;

  const updated = await prisma.newsletterCampaign.update({ where: { id: params.id }, data: updates });
  return NextResponse.json({ newsletter: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuthWithPermission(req, "email:write");
  if (error) return error;

  const newsletter = await prisma.newsletterCampaign.findUnique({ where: { id: params.id } });
  if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (newsletter.status === "sent") return NextResponse.json({ error: "Cannot delete sent newsletters" }, { status: 400 });

  await prisma.newsletterCampaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
