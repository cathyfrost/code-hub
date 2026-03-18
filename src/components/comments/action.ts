"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getCommentDataInclude, PostData } from "@/lib/types";
import { createCommentSchema } from "@/lib/validation";

export async function submitComment({
  post,
  content,
  parentId,
}: {
  post: PostData;
  content: string;
  parentId?: string;
}) {
  const { user } = await validateRequest();

  if (!user) throw Error("未授权");

  const { content: contentValidated } = createCommentSchema.parse({ content });

  const [newComment] = await prisma.$transaction([
    prisma.comment.create({
    data: {
      content: contentValidated,
      postId: post.id,
      userId: user.id,
      parentId: parentId || null,
    },
    include: getCommentDataInclude(user.id),
  }),
  ...(post.user.id !== user.id
    ? [
      prisma.notification.create({
        data: {
          issuerId: user.id,
          recipientId: post.user.id,
          postId: post.id,
          type: "COMMENT"
        }
      })
    ]: []
  )
  ])


  return newComment;
}

export async function deleteComment(id: string) {
  const { user } = await validateRequest();

  if (!user) throw Error("未授权");

  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) throw new Error("评论不存在");

  if (comment.userId !== user.id) throw new Error("未授权");

  const deletedComment = await prisma.comment.delete({
    where: { id },
    include: getCommentDataInclude(user.id),
  });

  return deletedComment;
}