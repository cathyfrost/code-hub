import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 20;

    const bookmarks = await prisma.bookmark.findMany({
      where: { post: { userId: user.id } },
      orderBy: { createAt: "desc" },
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
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

    const hasMore = bookmarks.length > pageSize;
    const items = hasMore ? bookmarks.slice(0, pageSize) : bookmarks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      items: items.map((b) => ({
        id: b.id,
        createAt: b.createAt,
        user: b.user,
        postId: b.post.id,
        postContent: b.post.content.substring(0, 100) + (b.post.content.length > 100 ? "..." : ""),
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Bookmarks list error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}