import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/social/posts/[id]/react
 * Toggle a heart reaction. Returns { reacted, reactionCount }.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const postId = params.id;
  const userId = session!.user.id;

  const existing = await prisma.postReaction.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true },
  });

  if (existing) {
    // Remove reaction
    await prisma.$transaction([
      prisma.postReaction.delete({ where: { postId_userId: { postId, userId } } }),
      prisma.politicianPost.update({
        where: { id: postId },
        data: { reactionCount: { decrement: 1 } },
      }),
    ]);
    const post = await prisma.politicianPost.findUnique({
      where: { id: postId },
      select: { reactionCount: true },
    });
    return NextResponse.json({ reacted: false, reactionCount: post?.reactionCount ?? 0 });
  }

  // Add reaction
  await prisma.$transaction([
    prisma.postReaction.create({ data: { postId, userId } }),
    prisma.politicianPost.update({
      where: { id: postId },
      data: { reactionCount: { increment: 1 } },
    }),
  ]);
  const post = await prisma.politicianPost.findUnique({
    where: { id: postId },
    select: { reactionCount: true },
  });
  return NextResponse.json({ reacted: true, reactionCount: post?.reactionCount ?? 0 });
}
