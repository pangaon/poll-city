import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const CommentSchema = z.object({
  body: z.string().min(1).max(1000),
  parentId: z.string().cuid().optional().nullable(),
});

/**
 * GET /api/social/posts/[id]/comments
 * Returns published top-level comments with up to one level of replies.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const cursor = searchParams.get("cursor") ?? undefined;

  const comments = await prisma.postComment.findMany({
    where: {
      postId: params.id,
      parentId: null,
      isDeleted: false,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
      replies: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  const nextCursor = comments.length === limit ? comments[comments.length - 1].id : null;
  return NextResponse.json({ data: comments, nextCursor });
}

/**
 * POST /api/social/posts/[id]/comments
 * Add a comment. Auth required.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = CommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const postId = params.id;
  const post = await prisma.politicianPost.findUnique({
    where: { id: postId },
    select: { id: true, isPublished: true },
  });
  if (!post?.isPublished) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const [comment] = await prisma.$transaction([
    prisma.postComment.create({
      data: {
        postId,
        userId: session!.user.id,
        body: parsed.data.body,
        parentId: parsed.data.parentId ?? null,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        parentId: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.politicianPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ data: comment }, { status: 201 });
}
