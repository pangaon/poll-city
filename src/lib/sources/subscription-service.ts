import prisma from "@/lib/db/prisma";
import type {
  SourceActivationStatus,
  SourceAlertThreshold,
} from "@prisma/client";

export async function getCampaignActivations(campaignId: string) {
  return prisma.campaignSourceActivation.findMany({
    where: { campaignId },
    include: {
      source: {
        select: {
          id: true,
          name: true,
          slug: true,
          sourceType: true,
          sourceStatus: true,
          municipality: true,
          feedUrl: true,
          canonicalUrl: true,
          isRecommended: true,
          lastSuccessAt: true,
          lastCheckedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActivationById(id: string, campaignId: string) {
  return prisma.campaignSourceActivation.findFirst({
    where: { id, campaignId },
    include: { source: true },
  });
}

export async function activateSource(
  campaignId: string,
  sourceId: string,
  options: {
    customAlertThreshold?: SourceAlertThreshold;
    monitoringModes?: string[];
    keywords?: string[];
    mentionTracking?: boolean;
    sentimentTracking?: boolean;
    issueTracking?: boolean;
    opponentTracking?: boolean;
    dailyDigest?: boolean;
    realTimeAlerts?: boolean;
    createdByUserId?: string;
  } = {}
) {
  // Verify source exists and is globally accessible or owned by this tenant
  const source = await prisma.platformSource.findFirst({
    where: {
      id: sourceId,
      isActive: true,
      OR: [
        { ownershipType: "global" },
        { ownershipType: "tenant_private", ownerTenantId: campaignId },
      ],
    },
  });

  if (!source) {
    throw new Error("Source not found or not accessible for this campaign.");
  }

  return prisma.campaignSourceActivation.upsert({
    where: { campaignId_sourceId: { campaignId, sourceId } },
    create: {
      campaignId,
      sourceId,
      status: "active",
      customAlertThreshold: options.customAlertThreshold,
      monitoringModesJson: options.monitoringModes ?? [],
      keywordProfileJson: options.keywords ?? [],
      mentionTrackingEnabled: options.mentionTracking ?? true,
      sentimentTrackingEnabled: options.sentimentTracking ?? true,
      issueTrackingEnabled: options.issueTracking ?? true,
      opponentTrackingEnabled: options.opponentTracking ?? false,
      dailyDigestEnabled: options.dailyDigest ?? true,
      realTimeAlertsEnabled: options.realTimeAlerts ?? false,
      createdByUserId: options.createdByUserId,
    },
    update: {
      status: "active",
      customAlertThreshold: options.customAlertThreshold,
      updatedByUserId: options.createdByUserId,
    },
  });
}

export async function deactivateSource(campaignId: string, sourceId: string) {
  return prisma.campaignSourceActivation.updateMany({
    where: { campaignId, sourceId },
    data: { status: "disabled" },
  });
}

export async function pauseSource(campaignId: string, sourceId: string, mutedUntil?: Date) {
  return prisma.campaignSourceActivation.updateMany({
    where: { campaignId, sourceId },
    data: {
      status: mutedUntil ? "muted" : "paused",
      mutedUntil: mutedUntil ?? null,
    },
  });
}

export async function updateActivationSettings(
  id: string,
  campaignId: string,
  data: Partial<{
    status: SourceActivationStatus;
    customAlertThreshold: SourceAlertThreshold;
    monitoringModesJson: string[];
    keywordProfileJson: string[];
    mentionTrackingEnabled: boolean;
    sentimentTrackingEnabled: boolean;
    issueTrackingEnabled: boolean;
    opponentTrackingEnabled: boolean;
    dailyDigestEnabled: boolean;
    realTimeAlertsEnabled: boolean;
    updatedByUserId: string;
  }>
) {
  return prisma.campaignSourceActivation.updateMany({
    where: { id, campaignId },
    data,
  });
}

// ── Source library browsing (tenant-safe) ─────────────────────────────────────

export async function browseSources(
  campaignId: string,
  filters: {
    municipality?: string;
    sourceType?: string;
    isRecommended?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const { municipality, sourceType, isRecommended, search, page = 1, limit = 50 } = filters;

  const where: {
    isActive: boolean;
    sourceStatus: string;
    OR: Array<{ ownershipType: string } | { ownershipType: string; ownerTenantId: string }>;
    sourceType?: { equals: string };
    municipality?: { contains: string; mode: "insensitive" };
    isRecommended?: boolean;
    AND?: Array<{
      OR: Array<{
        name?: { contains: string; mode: "insensitive" };
        description?: { contains: string; mode: "insensitive" };
        canonicalUrl?: { contains: string; mode: "insensitive" };
        municipality?: { contains: string; mode: "insensitive" };
      }>;
    }>;
  } = {
    isActive: true,
    sourceStatus: "active",
    OR: [
      { ownershipType: "global" },
      { ownershipType: "tenant_private", ownerTenantId: campaignId },
    ],
  };

  if (sourceType) where.sourceType = { equals: sourceType };
  if (municipality) where.municipality = { contains: municipality, mode: "insensitive" };
  if (isRecommended !== undefined) where.isRecommended = isRecommended;
  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { canonicalUrl: { contains: search, mode: "insensitive" } },
          { municipality: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [sources, total, myActivations] = await Promise.all([
    prisma.platformSource.findMany({
      where,
      orderBy: [{ isRecommended: "desc" }, { priorityScore: "desc" }, { name: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sourceType: true,
        platform: true,
        canonicalUrl: true,
        feedUrl: true,
        municipality: true,
        province: true,
        language: true,
        isRecommended: true,
        isFeatured: true,
        credibilityScore: true,
        defaultAlertThreshold: true,
        lastSuccessAt: true,
        topicTagsJson: true,
      },
    }),
    prisma.platformSource.count({ where }),
    prisma.campaignSourceActivation.findMany({
      where: { campaignId },
      select: { sourceId: true, status: true },
    }),
  ]);

  const activationMap = new Map(myActivations.map((a) => [a.sourceId, a.status]));

  const sourcesWithStatus = sources.map((s) => ({
    ...s,
    activationStatus: activationMap.get(s.id) ?? null,
    isActive: activationMap.has(s.id) && activationMap.get(s.id) === "active",
  }));

  return { sources: sourcesWithStatus, total, page, limit };
}

// ── Pack activation ───────────────────────────────────────────────────────────

export async function activatePack(campaignId: string, packId: string, activatedById?: string) {
  const pack = await prisma.sourcePack.findUnique({
    where: { id: packId },
    include: { items: { select: { sourceId: true } } },
  });
  if (!pack) throw new Error("Pack not found.");

  // Activate the pack record
  await prisma.campaignPackActivation.upsert({
    where: { campaignId_packId: { campaignId, packId } },
    create: { campaignId, packId, isEnabled: true, activatedById },
    update: { isEnabled: true, deactivatedAt: null },
  });

  // Activate all sources in the pack for this campaign
  await Promise.all(
    pack.items.map((item) =>
      prisma.campaignSourceActivation.upsert({
        where: { campaignId_sourceId: { campaignId, sourceId: item.sourceId } },
        create: { campaignId, sourceId: item.sourceId, status: "active", createdByUserId: activatedById },
        update: { status: "active" },
      })
    )
  );

  return { packId, sourcesActivated: pack.items.length };
}

export async function deactivatePack(campaignId: string, packId: string) {
  await prisma.campaignPackActivation.updateMany({
    where: { campaignId, packId },
    data: { isEnabled: false, deactivatedAt: new Date() },
  });
}

export async function getCampaignPacks(campaignId: string) {
  return prisma.campaignPackActivation.findMany({
    where: { campaignId },
    include: {
      pack: {
        include: {
          _count: { select: { items: true } },
        },
      },
    },
    orderBy: { activatedAt: "desc" },
  });
}
