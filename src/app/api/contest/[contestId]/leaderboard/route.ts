import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/contest/[contestId]/leaderboard — 获取排行榜
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

    // 获取所有通过的提交，按用户分组
    const submissions = await prisma.contestSubmission.findMany({
      where: {
        contestId,
        passed: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createAt: "asc" },
    });

    // 按用户聚合：每题只取第一次通过的提交
    const userMap = new Map<
      string,
      {
        user: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        };
        solvedCount: number;
        totalPenalty: number;
        solvedQuizIds: Set<string>;
      }
    >();

    for (const sub of submissions) {
      if (!userMap.has(sub.userId)) {
        userMap.set(sub.userId, {
          user: sub.user,
          solvedCount: 0,
          totalPenalty: 0,
          solvedQuizIds: new Set(),
        });
      }

      const entry = userMap.get(sub.userId)!;

      // 每题只算第一次通过
      if (!entry.solvedQuizIds.has(sub.quizId)) {
        entry.solvedQuizIds.add(sub.quizId);
        entry.solvedCount += 1;
        entry.totalPenalty += sub.penalty;
      }
    }

    // 排序：通过题数多的排前面，题数相同看罚时少的
    const leaderboard = Array.from(userMap.values())
      .map((entry) => ({
        user: entry.user,
        solvedCount: entry.solvedCount,
        totalPenalty: entry.totalPenalty,
      }))
      .sort((a, b) => {
        if (b.solvedCount !== a.solvedCount) {
          return b.solvedCount - a.solvedCount;
        }
        return a.totalPenalty - b.totalPenalty;
      });

    return Response.json(leaderboard);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
