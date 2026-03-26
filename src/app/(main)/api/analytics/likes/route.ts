import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 20;

    const likes = await prisma.like.findMany({
      where: { post: { userId: user.id } },
      orderBy: { post: { createAt: "desc" } },
      take: pageSize + 1,
      ...(cursor ? { cursor: { userId_postId: JSON.parse(cursor) }, skip: 1 } : {}),
      select: {
        userId: true,
        postId: true,
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            createAt: true,
          },
        },
      },
    });

    const hasMore = likes.length > pageSize;
    const items = hasMore ? likes.slice(0, pageSize) : likes;
    const nextCursor = hasMore
      ? JSON.stringify({ userId: items[items.length - 1].userId, postId: items[items.length - 1].postId })
      : null;

    return NextResponse.json({
      items: items.map((l) => ({
        user: l.user,
        postId: l.post.id,
        postContent: l.post.content.substring(0, 100) + (l.post.content.length > 100 ? "..." : ""),
        postCreateAt: l.post.createAt,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Likes list error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}