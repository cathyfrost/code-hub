import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "未授权" }, { status: 401 });

    const { postId } = await params;

    // 用 cookie 防重：同一用户同一帖子每天只计一次
    const viewKey = `viewed_${postId}`;
    const cookie = req.cookies.get(viewKey);

    if (cookie) {
      return Response.json({ success: true, counted: false });
    }

    await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    // 设置 cookie，当天过期
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return new Response(JSON.stringify({ success: true, counted: true }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `${viewKey}=1; Path=/; HttpOnly; SameSite=Lax; Expires=${endOfDay.toUTCString()}`,
      },
    });
  } catch {
    return Response.json({ error: "内部错误" }, { status: 500 });
  }
}