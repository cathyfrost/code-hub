import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { folderId } = await params;
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return Response.json({ error: "文件夹名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.notebookFolder.findUnique({
      where: { id: folderId, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "文件夹不存在" }, { status: 404 });
    }

    const duplicate = await prisma.notebookFolder.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
        id: { not: folderId },
      },
    });

    if (duplicate) {
      return Response.json({ error: "文件夹名称已存在" }, { status: 409 });
    }

    const folder = await prisma.notebookFolder.update({
      where: { id: folderId },
      data: { name: name.trim() },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { folderId } = await params;

    const existing = await prisma.notebookFolder.findUnique({
      where: { id: folderId, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "文件夹不存在" }, { status: 404 });
    }

    await prisma.notebookFolder.delete({ where: { id: folderId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}