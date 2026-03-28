import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getUserDataSelect } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const { postId } = await params;

  const comments = await prisma.inlineComment.findMany({
    where: { postId },
    include: {
      user: { select: getUserDataSelect(loggedInUser.id) },
    },
    orderBy: { createAt: "asc" },
  });

  return Response.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const { postId } = await params;
  const { content, lineNumber, codeBlockIndex } = await req.json();

  if (!content?.trim() || lineNumber == null) {
    return Response.json({ error: "参数不完整" }, { status: 400 });
  }

  const comment = await prisma.inlineComment.create({
    data: {
      content: content.trim(),
      lineNumber,
      codeBlockIndex: codeBlockIndex ?? 0,
      postId,
      userId: loggedInUser.id,
    },
    include: {
      user: { select: getUserDataSelect(loggedInUser.id) },
    },
  });

  return Response.json(comment);
}