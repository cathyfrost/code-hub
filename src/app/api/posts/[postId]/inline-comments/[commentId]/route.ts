import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const { commentId } = await params;

  const comment = await prisma.inlineComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) {
    return Response.json({ error: "未找到批注" }, { status: 404 });
  }

  if (comment.userId !== loggedInUser.id) {
    return Response.json({ error: "无权删除此批注" }, { status: 403 });
  }

  const deletedComment = await prisma.inlineComment.delete({
    where: { id: commentId },
  });

  return Response.json(deletedComment);
}