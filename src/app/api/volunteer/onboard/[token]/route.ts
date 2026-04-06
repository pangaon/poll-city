import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await prisma.volunteerOnboardingToken.findUnique({
    where: { token: params.token },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          candidateName: true,
          logoUrl: true,
          volunteerCodeOfConduct: true,
          volunteerIntroVideoUrl: true,
        },
      },
    },
  });

  if (!invite) return NextResponse.json({ error: "Invalid token" }, { status: 404, headers: NO_STORE_HEADERS });
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({
    data: {
      token: invite.token,
      firstName: invite.firstName,
      lastName: invite.lastName,
      email: invite.email,
      phone: invite.phone,
      preferredWard: invite.preferredWard,
      campaign: invite.campaign,
    },
  }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => null) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    availability?: string[];
    skills?: string[];
    preferredWard?: string;
    acceptedCode?: boolean;
    onboardingNotes?: string;
  } | null;

  if (!body || !body.firstName || !body.lastName || !body.email || !body.acceptedCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const invite = await prisma.volunteerOnboardingToken.findUnique({ where: { token: params.token } });
  if (!invite) return NextResponse.json({ error: "Invalid token" }, { status: 404, headers: NO_STORE_HEADERS });
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410, headers: NO_STORE_HEADERS });
  }

  const emailLower = body.email.trim().toLowerCase();

  const contact = await prisma.contact.upsert({
    where: {
      id: `v-onboard-${invite.id}`,
    },
    update: {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: emailLower,
      phone: body.phone?.trim() || null,
      ward: body.preferredWard?.trim() || invite.preferredWard || null,
      volunteerInterest: true,
      notes: body.onboardingNotes?.trim() || null,
      campaignId: invite.campaignId,
    },
    create: {
      id: `v-onboard-${invite.id}`,
      campaignId: invite.campaignId,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: emailLower,
      phone: body.phone?.trim() || null,
      ward: body.preferredWard?.trim() || invite.preferredWard || null,
      volunteerInterest: true,
      notes: body.onboardingNotes?.trim() || null,
    },
  });

  await prisma.volunteerProfile.upsert({
    where: { contactId: contact.id },
    update: {
      campaignId: invite.campaignId,
      availabilityJson: { slots: body.availability ?? [] },
      availability: (body.availability ?? []).join(", "),
      skills: body.skills ?? [],
      isActive: true,
      notes: body.onboardingNotes?.trim() || null,
    },
    create: {
      campaignId: invite.campaignId,
      contactId: contact.id,
      availabilityJson: { slots: body.availability ?? [] },
      availability: (body.availability ?? []).join(", "),
      skills: body.skills ?? [],
      isActive: true,
      notes: body.onboardingNotes?.trim() || null,
    },
  });

  await prisma.volunteerOnboardingToken.update({
    where: { id: invite.id },
    data: { status: "completed", consumedAt: new Date() },
  });

  return NextResponse.json({ data: { success: true, contactId: contact.id } }, { headers: NO_STORE_HEADERS });
}
