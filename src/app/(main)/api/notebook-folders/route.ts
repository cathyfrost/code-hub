import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const folders = await prisma.notebookFolder.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { notebooks: true },
        },
      },
      orderBy: [{ order: "asc" }, { createAt: "asc" }],
    });

    return Response.json(folders);
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

    const { name } = await req.json();

    if (!name || !name.trim()) {
      return Response.json({ error: "文件夹名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.notebookFolder.findUnique({
      where: {
        userId_name: { userId: user.id, name: name.trim() },
      },
    });

    if (existing) {
      return Response.json({ error: "文件夹名称已存在" }, { status: 409 });
    }

    const folder = await prisma.notebookFolder.create({
      data: {
        name: name.trim(),
        userId: user.id,
      },
      include: {
        _count: {
          select: { notebooks: true },
        },
      },
    });

    return Response.json(folder);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}