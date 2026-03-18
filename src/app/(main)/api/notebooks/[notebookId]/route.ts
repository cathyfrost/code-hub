import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getNotebookDataInclude } from "@/lib/types";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ notebookId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { notebookId } = await params;

    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId, userId: user.id },
      include: getNotebookDataInclude(),
    });

    if (!notebook) {
      return Response.json({ error: "笔记不存在" }, { status: 404 });
    }

    return Response.json(notebook);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notebookId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { notebookId } = await params;
    const body = await req.json();

    const existing = await prisma.notebook.findUnique({
      where: { id: notebookId, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "笔记不存在" }, { status: 404 });
    }

    const data: Prisma.NotebookUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;
    if (body.folderId !== undefined) {
      data.folder = body.folderId
        ? { connect: { id: body.folderId } }
        : { disconnect: true };
    }
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.pinned !== undefined) data.pinned = body.pinned;

    const notebook = await prisma.notebook.update({
      where: { id: notebookId },
      data,
      include: getNotebookDataInclude(),
    });

    return Response.json(notebook);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ notebookId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { notebookId } = await params;

    const existing = await prisma.notebook.findUnique({
      where: { id: notebookId, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "笔记不存在" }, { status: 404 });
    }

    await prisma.notebook.delete({ where: { id: notebookId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}