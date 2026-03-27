import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "未授权" }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.pointTransaction.findFirst({
      where: {
        userId: user.id,
        type: "DAILY_SIGNIN",
        createAt: { gte: today },
      },
    });

    if (existing) {
      return Response.json({ signed: true, awarded: 0 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: 2 } },
      }),
      prisma.pointTransaction.create({
        data: {
          userId: user.id,
          amount: 2,
          type: "DAILY_SIGNIN",
          detail: "每日登录奖励",
        },
      }),
    ]);

    return Response.json({ signed: true, awarded: 2 });
  } catch {
    return Response.json({ error: "内部错误" }, { status: 500 });
  }
}