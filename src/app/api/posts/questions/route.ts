import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const status = req.nextUrl.searchParams.get("status") || "all";

    const pageSize = 10;

    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const where: Record<string, unknown> = {
      isQuestion: true,
    };

    if (status === "open") {
      where.isResolved = false;
      where.bounty = { gt: 0 };
    } else if (status === "resolved") {
      where.isResolved = true;
    } else if (status === "mine") {
      where.userId = user.id;
    }

    const posts = await prisma.post.findMany({
      where,
      include: getPostDataInclude(user.id),
      orderBy: { createAt: "desc" },
      take: pageSize + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;

    const data: PostsPage = {
      posts: posts.slice(0, pageSize),
      nextCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}