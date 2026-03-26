import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 20;

    const comments = await prisma.comment.findMany({
      where: {
        post: { userId: user.id },
        userId: { not: user.id },
      },
      orderBy: { createAt: "desc" },
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        createAt: true,
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
          },
        },
      },
    });

    const hasMore = comments.length > pageSize;
    const items = hasMore ? comments.slice(0, pageSize) : comments;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      items: items.map((c) => ({
        id: c.id,
        content: c.content,
        createAt: c.createAt,
        user: c.user,
        postId: c.post.id,
        postContent: c.post.content.substring(0, 100) + (c.post.content.length > 100 ? "..." : ""),
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Comments list error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}