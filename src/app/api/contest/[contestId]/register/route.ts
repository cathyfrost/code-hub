import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/contest/[contestId]/register — 报名竞赛
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { contestId } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      return Response.json({ error: "竞赛不存在" }, { status: 404 });
    }

    if (contest.status !== "UPCOMING") {
      return Response.json({ error: "竞赛已开始或已结束，无法报名" }, { status: 400 });
    }

    const existing = await prisma.contestRegistration.findUnique({
      where: {
        contestId_userId: { contestId, userId: user.id },
      },
    });

    if (existing) {
      return Response.json({ error: "你已经报名了" }, { status: 400 });
    }

    const registration = await prisma.contestRegistration.create({
      data: {
        contestId,
        userId: user.id,
      },
    });

    return Response.json(registration);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
