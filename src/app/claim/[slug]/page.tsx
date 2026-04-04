import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import ClaimClient from "./claim-client";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: "Claim Your Profile" };
}

export default async function ClaimPage({ params }: PageProps) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    include: {
      official: {
        select: {
          id: true,
          name: true,
          title: true,
          district: true,
          level: true,
          isClaimed: true,
          photoUrl: true,
          province: true,
        },
      },
    },
  });

  if (!campaign || !campaign.official) {
    notFound();
  }

  if (campaign.official.isClaimed) {
    // Already claimed — redirect to the public page
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <p className="text-gray-700">
              This profile has already been claimed.{" "}
              <a href={`/candidates/${params.slug}`} className="text-blue-600 hover:underline">
                View the public page
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClaimClient
      campaign={{ slug: campaign.slug, name: campaign.name }}
      official={{
        id: campaign.official.id,
        name: campaign.official.name,
        title: campaign.official.title,
        district: campaign.official.district,
        level: campaign.official.level,
        photoUrl: campaign.official.photoUrl,
        province: campaign.official.province,
      }}
    />
  );
}
