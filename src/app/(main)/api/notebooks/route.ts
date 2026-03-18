import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getNotebookDataInclude } from "@/lib/types";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const search = req.nextUrl.searchParams.get("search") || undefined;
    const folderId = req.nextUrl.searchParams.get("folderId") || undefined;
    const tag = req.nextUrl.searchParams.get("tag") || undefined;
    const pageSize = 20;

    const where: Prisma.NotebookWhereInput = { userId: user.id };

    if (folderId === "uncategorized") {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const notebooks = await prisma.notebook.findMany({
      where,
      include: getNotebookDataInclude(),
      orderBy: [{ pinned: "desc" }, { updateAt: "desc" }],
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const nextCursor =
      notebooks.length > pageSize ? notebooks[pageSize].id : null;

    return Response.json({
      notebooks: notebooks.slice(0, pageSize),
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { title, content, folderId, tags } = await req.json();

    const notebook = await prisma.notebook.create({
      data: {
        title: title || "无标题笔记",
        content: content || "",
        userId: user.id,
        folderId: folderId || null,
        tags: tags || [],
      },
      include: getNotebookDataInclude(),
    });

    return Response.json(notebook);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}