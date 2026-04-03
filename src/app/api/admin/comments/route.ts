import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 20;
    const search = searchParams.get("search") || "";

    const where = search
      ? { content: { contains: search, mode: "insensitive" as const } }
      : {};

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        select: {
          id: true,
          content: true,
          createAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          post: {
            select: {
              id: true,
              content: true,
            },
          },
        },
        orderBy: { createAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.comment.count({ where }),
    ]);

    return Response.json({
      comments,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}