import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { pushFanOut } from "@/lib/social/push-notify";

const CreatePostSchema = z.object({
  officialId: z.string().cuid().optional(),
  campaignId: z.string().cuid().optional(),
  postType: z.enum(["poll", "announcement", "civic_update", "bill_update", "project_update"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pollId: z.string().cuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  municipalScope: z.string().max(100).optional().nullable(),
  isPublished: z.boolean().optional().default(true),
});

/**
 * GET /api/social/posts
 * Returns published posts, optionally filtered by officialId or campaignId.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const officialId = searchParams.get("officialId");
  const campaignId = searchParams.get("campaignId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const posts = await prisma.politicianPost.findMany({
    where: {
      isPublished: true,
      ...(officialId ? { officialId } : {}),
      ...(campaignId ? { campaignId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      postType: true,
      title: true,
      body: true,
      authorName: true,
      imageUrl: true,
      municipalScope: true,
      pollId: true,
      isPublished: true,
      createdAt: true,
      poll: {
        select: { id: true, question: true, type: true, totalResponses: true, isActive: true },
      },
    },
  });

  return NextResponse.json({ data: posts });
}

/**
 * POST /api/social/posts
 * Creates a new politician post. Caller must be authenticated and linked to the
 * official or campaign they are posting on behalf of.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Require at least one of officialId or campaignId
  if (!data.officialId && !data.campaignId) {
    return NextResponse.json(
      { error: "officialId or campaignId is required" },
      { status: 422 }
    );
  }

  // Resolve author display name
  let authorName = session!.user.name ?? "Unknown";
  if (data.officialId) {
    const official = await prisma.official.findUnique({
      where: { id: data.officialId },
      select: { name: true },
    });
    if (!official) return NextResponse.json({ error: "Official not found" }, { status: 404 });
    authorName = official.name;
  } else if (data.campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId },
      select: { candidateName: true, name: true },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    authorName = campaign.candidateName ?? campaign.name;
  }

  const post = await prisma.politicianPost.create({
    data: {
      officialId: data.officialId ?? null,
      campaignId: data.campaignId ?? null,
      authorName,
      postType: data.postType,
      title: data.title,
      body: data.body,
      pollId: data.pollId ?? null,
      imageUrl: data.imageUrl ?? null,
      municipalScope: data.municipalScope ?? null,
      isPublished: data.isPublished,
    },
  });

  // Fan-out notifications to all followers (fire-and-forget)
  if (data.officialId && post.isPublished) {
    void fanOutNotifications(data.officialId, authorName, post.id, post.postType, post.title);
  }

  return NextResponse.json({ data: post }, { status: 201 });
}

async function fanOutNotifications(
  officialId: string,
  officialName: string,
  postId: string,
  postType: string,
  postTitle: string
) {
  try {
    const followers = await prisma.officialFollow.findMany({
      where: { officialId },
      select: { userId: true },
    });

    if (followers.length === 0) return;

    const typeLabel =
      postType === "poll" ? "new_poll" :
      postType === "announcement" ? "announcement" :
      "new_post";

    const notifBody = postType === "poll"
      ? `${officialName} posted a new poll — vote now`
      : `New ${postType.replace(/_/g, " ")} from ${officialName}`;

    // Create in-app notifications
    await prisma.socialNotification.createMany({
      data: followers.map((f) => ({
        userId: f.userId,
        postId,
        officialId,
        type: typeLabel,
        title: postTitle,
        body: notifBody,
        isRead: false,
      })),
      skipDuplicates: true,
    });

    // Dispatch real push notifications
    const followerIds = followers.map((f) => f.userId);
    await pushFanOut(followerIds, {
      title: officialName,
      body: postTitle.length > 80 ? `${postTitle.slice(0, 77)}…` : postTitle,
      url: `/social/politicians/${officialId}`,
      tag: `post-${postId}`,
    });
  } catch {
    // Non-fatal — notification failure does not block post creation
  }
}
