"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { createQuestionSchema } from "@/lib/validation";

export async function submitQuestion(input: {
  content: string;
  mediaIds: string[];
  bounty: number;
}) {
  const { user } = await validateRequest();
  if (!user) return { error: "未授权" };

  const { content, mediaIds, bounty } = createQuestionSchema.parse(input);

  const newPost = await prisma.$transaction(async (tx) => {
    // 如果有悬赏，检查并扣除积分
    if (bounty > 0) {
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { points: true },
      });

      if (!currentUser || currentUser.points < bounty) {
        return { error: "积分不足，无法发布悬赏" };
      }

      await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: bounty } },
      });

      await tx.pointTransaction.create({
        data: {
          userId: user.id,
          amount: -bounty,
          type: "BOUNTY_PLACED",
          detail: `发布悬赏提问，预扣 ${bounty} 积分`,
        },
      });
    }

    const post = await tx.post.create({
      data: {
        content,
        userId: user.id,
        isQuestion: true,
        bounty,
        attachments: {
          connect: mediaIds.map((id) => ({ id })),
        },
      },
      include: getPostDataInclude(user.id),
    });

    // 回填 postId 到积分流水
    if (bounty > 0) {
      await tx.pointTransaction.updateMany({
        where: {
          userId: user.id,
          type: "BOUNTY_PLACED",
          postId: null,
        },
        data: { postId: post.id },
      });
    }

    return post;
  });

  return newPost;
}

export async function acceptAnswer(postId: string, commentId: string) {
  const { user } = await validateRequest();
  if (!user) return { error: "未授权" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: {
          userId: true,
          isQuestion: true,
          isResolved: true,
          bounty: true,
        },
      });

      if (!post) return { error: "帖子不存在" };
      if (!post.isQuestion) return { error: "该帖子不是提问帖" };
      if (post.isResolved) return { error: "该问题已有最佳答案" };
      if (post.userId !== user.id) return { error: "只有题主可以采纳答案" };

      const comment = await tx.comment.findUnique({
        where: { id: commentId },
        select: { userId: true, postId: true },
      });

      if (!comment) return { error: "评论不存在" };
      if (comment.postId !== postId) return { error: "该评论不属于此帖子" };
      if (comment.userId === user.id) return { error: "不能采纳自己的回答" };

      // 更新帖子状态
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          isResolved: true,
          acceptedCommentId: commentId,
        },
        include: getPostDataInclude(user.id),
      });

      // 转移悬赏积分
      if (post.bounty > 0) {
        await tx.user.update({
          where: { id: comment.userId },
          data: { points: { increment: post.bounty } },
        });

        await tx.pointTransaction.create({
          data: {
            userId: comment.userId,
            amount: post.bounty,
            type: "BOUNTY_EARNED",
            postId,
            detail: `回答被采纳，获得 ${post.bounty} 积分`,
          },
        });
      }

      // 发送通知
      await tx.notification.create({
        data: {
          issuerId: user.id,
          recipientId: comment.userId,
          postId,
          commentId,
          type: "BOUNTY_ACCEPTED",
        },
      });

      return updatedPost;
    });

    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unique constraint") ||
        error.message.includes("已有最佳答案"))
    ) {
      return { error: "该问题已有最佳答案" };
    }
    return { error: "操作失败，请重试" };
  }
}

export async function deleteQuestion(id: string) {
  const { user } = await validateRequest();
  if (!user) return { error: "未授权" };

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      userId: true,
      isQuestion: true,
      bounty: true,
      isResolved: true,
    },
  });

  if (!post) return { error: "帖子不存在" };
  if (post.userId !== user.id) return { error: "未授权" };
  if (!post.isQuestion) return { error: "该帖子不是问答帖" };

  await prisma.$transaction(async (tx) => {
    // 未解决且有悬赏：退还积分
    if (!post.isResolved && post.bounty > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: post.bounty } },
      });

      await tx.pointTransaction.create({
        data: {
          userId: user.id,
          amount: post.bounty,
          type: "BOUNTY_REFUND",
          postId: id,
          detail: `删除悬赏问题，退回 ${post.bounty} 积分`,
        },
      });
    }

    await tx.post.delete({ where: { id } });
  });

  return { success: true };
}

export async function updateQuestion(input: {
  postId: string;
  content: string;
  mediaIds: string[];
}) {
  const { user } = await validateRequest();
  if (!user) return { error: "未授权" };

  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { userId: true, isQuestion: true },
  });

  if (!post) return { error: "帖子不存在" };
  if (post.userId !== user.id) return { error: "未授权" };
  if (!post.isQuestion) return { error: "该帖子不是问答帖" };

  const updatedPost = await prisma.post.update({
    where: { id: input.postId },
    data: {
      content: input.content,
      attachments: {
        set: input.mediaIds.map((id) => ({ id })),
      },
    },
    include: getPostDataInclude(user.id),
  });

  return updatedPost;
}