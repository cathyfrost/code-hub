import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { userIds } = (await req.json()) as { userIds: string[] };

    if (!userIds || !userIds.length) {
      return Response.json({ error: "请选择至少一个用户" }, { status: 400 });
    }

    // 从数据库查出选中的用户信息
    const selectedUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // 用服务端 SDK 把这些用户同步到 Stream（upsert）
    await streamServerClient.upsertUsers(
      selectedUsers.map((u) => ({
        id: u.id,
        name: u.displayName,
        username: u.username,
        image: u.avatarUrl || undefined,
      })),
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}