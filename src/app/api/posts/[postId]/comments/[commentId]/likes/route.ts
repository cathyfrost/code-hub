import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { CommentLikeInfo } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> },
) {
  try {
    const { commentId } = await params;
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        likes: {
          where: { userId: user.id },
          select: { userId: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    if (!comment) {
      return Response.json({ error: "评论不存在" }, { status: 404 });
    }

    const data: CommentLikeInfo = {
      likes: comment._count.likes,
      isLikedByUser: !!comment.likes.length,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> },
) {
  try {
    const { postId, commentId } = await params;
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) {
      return Response.json({ error: "评论不存在" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.commentLike.upsert({
        where: {
          userId_commentId: {
            userId: user.id,
            commentId,
          },
        },
        create: {
          userId: user.id,
          commentId,
        },
        update: {},
      }),
      ...(user.id !== comment.userId
        ? [
            prisma.notification.create({
              data: {
                issuerId: user.id,
                recipientId: comment.userId,
                postId,
                commentId,
                type: "LIKE",
              },
            }),
          ]
        : []),
    ]);

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> },
) {
  try {
    const { postId, commentId } = await params;
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) {
      return Response.json({ error: "评论不存在" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.commentLike.deleteMany({
        where: {
          userId: user.id,
          commentId,
        },
      }),
      prisma.notification.deleteMany({
        where: {
          issuerId: user.id,
          recipientId: comment.userId,
          postId,
          commentId,
          type: "LIKE",
        },
      }),
    ]);

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}