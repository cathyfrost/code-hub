import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/contest/[contestId] — 获取竞赛详情
export async function GET(
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
      include: {
        problems: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                description: true,
                examples: true,
                testCases: true,
                starterCode: true,
                hints: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        registrations: {
          where: { userId: user.id },
          select: { id: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!contest) {
      return Response.json({ error: "竞赛不存在" }, { status: 404 });
    }

    return Response.json({
      ...contest,
      isRegistered: contest.registrations.length > 0,
      registrations: undefined,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
