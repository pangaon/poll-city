import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import CandidateProfileClient from "./candidate-profile-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: params.id },
    select: { fullName: true, office: true, jurisdictionRef: true },
  });
  if (!candidate) return { title: "Candidate Not Found" };
  return {
    title: `${candidate.fullName} — ${candidate.office} · ${candidate.jurisdictionRef} | Poll City`,
  };
}

export default async function CandidatePage({ params }: { params: { id: string } }) {
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      fullName: true,
      office: true,
      wardOrRiding: true,
      jurisdictionRef: true,
      party: true,
      website: true,
      email: true,
      phone: true,
      socials: true,
      campaignStatus: true,
      officialId: true,
      createdAt: true,
    },
  });

  if (!candidate) notFound();

  // If this candidate is now an elected official, redirect to their official profile
  if (candidate.officialId) {
    redirect(`/social/politicians/${candidate.officialId}`);
  }

  return <CandidateProfileClient candidate={candidate} />;
}
