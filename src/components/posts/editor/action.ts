"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";
import { predictTags } from "@/lib/ml-client";

export async function submitPost(input: {
  content: string;
  mediaIds: string[];
}) {
  const { user } = await validateRequest();

  if (!user) throw Error("未授权");

  const { content, mediaIds } = createPostSchema.parse(input);

  // ── ML 预测标签（同步，发帖前完成） ──
  let finalContent = content;

  const result = await predictTags(content);
  if (result && !result.isJunk && result.tags.length > 0) {
    const hashtags = result.tags.map((tag) => `#${tag}`).join(" ");
    finalContent = `${content}\n\n${hashtags}`;
  }

  const newPost = await prisma.post.create({
    data: {
      content: finalContent,
      userId: user.id,
      isJunk: result?.isJunk ?? false,
      clusterId: result?.clusterId ?? null,
      attachments: {
        connect: mediaIds.map((id) => ({ id })),
      },
    },
    include: getPostDataInclude(user.id),
  });

  return newPost;
}