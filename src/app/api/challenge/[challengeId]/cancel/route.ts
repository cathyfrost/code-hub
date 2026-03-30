import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/challenge/[challengeId]/cancel — 取消匹配
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { challengeId } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return Response.json({ error: "对战不存在" }, { status: 404 });
    }

    if (challenge.challengerId !== user.id) {
      return Response.json({ error: "只有发起者可以取消" }, { status: 403 });
    }

    if (challenge.status !== "MATCHING") {
      return Response.json({ error: "只能取消等待中的匹配" }, { status: 400 });
    }

    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "CANCELLED" },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
