import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type {
  SourceType,
  SourceStatus,
  SourceVerificationStatus,
  SourceOwnershipType,
  SourceIngestionMethod,
  SourceAlertThreshold,
} from "@prisma/client";
import type { SourceFilters } from "./types";

export async function listSources(filters: SourceFilters = {}) {
  const {
    sourceType,
    sourceStatus,
    verificationStatus,
    ownershipType,
    municipality,
    province,
    isRecommended,
    isFeatured,
    isActive,
    search,
    page = 1,
    limit = 50,
  } = filters;

  const where: Prisma.PlatformSourceWhereInput = {};

  if (sourceType) where.sourceType = sourceType;
  if (sourceStatus) where.sourceStatus = sourceStatus;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (ownershipType) where.ownershipType = ownershipType;
  if (municipality) where.municipality = { contains: municipality, mode: "insensitive" };
  if (province) where.province = province;
  if (isRecommended !== undefined) where.isRecommended = isRecommended;
  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { canonicalUrl: { contains: search, mode: "insensitive" } },
      { municipality: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [sources, total] = await Promise.all([
    prisma.platformSource.findMany({
      where,
      orderBy: [{ priorityScore: "desc" }, { name: "asc" }],
      skip,
      take: limit,
      include: {
        _count: { select: { activations: true, items: true, packItems: true } },
        healthChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.platformSource.count({ where }),
  ]);

  return { sources, total, page, limit };
}

export async function getSourceById(id: string) {
  return prisma.platformSource.findUnique({
    where: { id },
    include: {
      endpoints: { orderBy: { isPrimary: "desc" } },
      healthChecks: { orderBy: { checkedAt: "desc" }, take: 10 },
      items: { orderBy: { discoveredAt: "desc" }, take: 20 },
      packItems: { include: { pack: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { activations: true, items: true } },
    },
  });
}

export async function createSource(data: {
  name: string;
  slug: string;
  description?: string;
  sourceType: SourceType;
  ingestionMethod?: SourceIngestionMethod;
  platform?: string;
  canonicalUrl?: string;
  feedUrl?: string;
  baseUrl?: string;
  language?: string;
  country?: string;
  province?: string;
  region?: string;
  municipality?: string;
  topicTagsJson?: Prisma.InputJsonValue;
  officeRelevanceJson?: Prisma.InputJsonValue;
  credibilityScore?: number;
  priorityScore?: number;
  defaultAlertThreshold?: SourceAlertThreshold;
  ownershipType?: SourceOwnershipType;
  ownerTenantId?: string;
  visibilityScope?: string;
  pollingCadenceMinutes?: number;
  isRecommended?: boolean;
  isFeatured?: boolean;
  notesInternal?: string;
  createdByUserId?: string;
}) {
  return prisma.platformSource.create({
    data: {
      ...data,
      topicTagsJson: data.topicTagsJson ?? Prisma.JsonNull,
      officeRelevanceJson: data.officeRelevanceJson ?? Prisma.JsonNull,
    },
  });
}

export async function updateSource(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    sourceType: SourceType;
    ingestionMethod: SourceIngestionMethod;
    platform: string;
    canonicalUrl: string;
    feedUrl: string;
    baseUrl: string;
    language: string;
    province: string;
    region: string;
    municipality: string;
    topicTagsJson: Prisma.InputJsonValue;
    officeRelevanceJson: Prisma.InputJsonValue;
    credibilityScore: number;
    priorityScore: number;
    defaultAlertThreshold: SourceAlertThreshold;
    verificationStatus: SourceVerificationStatus;
    sourceStatus: SourceStatus;
    ownershipType: SourceOwnershipType;
    visibilityScope: string;
    pollingCadenceMinutes: number;
    isRecommended: boolean;
    isFeatured: boolean;
    isActive: boolean;
    notesInternal: string;
    updatedByUserId: string;
  }>
) {
  return prisma.platformSource.update({ where: { id }, data });
}

export async function archiveSource(id: string, actorId?: string) {
  await prisma.platformSource.update({
    where: { id },
    data: { sourceStatus: "archived", archivedAt: new Date(), isActive: false },
  });
  if (actorId) {
    await prisma.sourceAuditLog.create({
      data: { sourceId: id, action: "archived", actorId },
    });
  }
}

export async function recordHealthCheck(
  sourceId: string,
  result: {
    httpStatus?: number;
    latencyMs?: number;
    isReachable: boolean;
    isFeedValid: boolean;
    isContentFresh: boolean;
    parserSuccess?: boolean;
    itemsFound?: number;
    itemsNew?: number;
    duplicateRatio?: number;
    errorMessage?: string;
    validationNotes?: string;
  }
) {
  const { isReachable, errorMessage } = result;

  const check = await prisma.sourceHealthCheck.create({
    data: {
      sourceId,
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
      isReachable,
      isFeedValid: result.isFeedValid,
      isContentFresh: result.isContentFresh,
      parserSuccess: result.parserSuccess ?? false,
      itemsFound: result.itemsFound ?? 0,
      itemsNew: result.itemsNew ?? 0,
      duplicateRatio: result.duplicateRatio ?? 0,
      errorMessage: result.errorMessage,
      validationNotes: result.validationNotes,
    },
  });

  // Update parent source timestamps + error count
  const update: Prisma.PlatformSourceUpdateInput = { lastCheckedAt: new Date() };
  if (isReachable) {
    update.lastSuccessAt = new Date();
    update.errorCount = 0;
    if (result.isFeedValid) update.sourceStatus = "active";
  } else {
    update.lastErrorAt = new Date();
    update.errorCount = { increment: 1 };
    // After 5 consecutive failures, mark broken
    const recent = await prisma.sourceHealthCheck.findMany({
      where: { sourceId },
      orderBy: { checkedAt: "desc" },
      take: 5,
      select: { isReachable: true },
    });
    if (recent.length === 5 && recent.every((r) => !r.isReachable)) {
      update.sourceStatus = "broken";
    }
  }

  await prisma.platformSource.update({ where: { id: sourceId }, data: update });

  if (errorMessage) {
    await prisma.sourceAuditLog.create({
      data: {
        sourceId,
        action: "health_check_failed",
        notes: errorMessage,
      },
    });
  }

  return check;
}

export async function getSourceStats() {
  const [total, active, broken, unverified, recommended] = await Promise.all([
    prisma.platformSource.count(),
    prisma.platformSource.count({ where: { sourceStatus: "active" } }),
    prisma.platformSource.count({ where: { sourceStatus: "broken" } }),
    prisma.platformSource.count({ where: { verificationStatus: "unverified" } }),
    prisma.platformSource.count({ where: { isRecommended: true } }),
  ]);
  return { total, active, broken, unverified, recommended };
}

// ── Pack operations ────────────────────────────────────────────────────────────

export async function listPacks(filters: {
  municipality?: string;
  packType?: string;
  isActive?: boolean;
  search?: string;
} = {}) {
  const where: Prisma.SourcePackWhereInput = {};
  if (filters.municipality) where.municipality = { contains: filters.municipality, mode: "insensitive" };
  if (filters.packType) where.packType = filters.packType;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.sourcePack.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true, campaignActivations: true } },
    },
  });
}

export async function getPackById(id: string) {
  return prisma.sourcePack.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          source: {
            select: {
              id: true,
              name: true,
              slug: true,
              sourceType: true,
              sourceStatus: true,
              municipality: true,
            },
          },
        },
      },
      _count: { select: { campaignActivations: true } },
    },
  });
}

export async function createPack(data: {
  name: string;
  slug: string;
  description?: string;
  visibility?: string;
  municipality?: string;
  geographyScope?: string;
  officeScope?: string;
  packType: string;
  isRecommended?: boolean;
  createdByUserId?: string;
}) {
  return prisma.sourcePack.create({ data });
}

export async function addSourceToPack(packId: string, sourceId: string) {
  return prisma.sourcePackItem.upsert({
    where: { packId_sourceId: { packId, sourceId } },
    create: { packId, sourceId },
    update: {},
  });
}

export async function removeSourceFromPack(packId: string, sourceId: string) {
  return prisma.sourcePackItem.deleteMany({ where: { packId, sourceId } });
}
