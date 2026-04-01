import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/contest/rankings — 全局竞赛排行榜（Top 10）
export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    // 获取所有通过的竞赛提交，按用户聚合
    const submissions = await prisma.contestSubmission.findMany({
      where: { passed: true },
      select: {
        userId: true,
        contestId: true,
        penalty: true,
      },
    });

    // 按用户聚合统计
    const userStats = new Map<
      string,
      { solvedCount: number; totalPenalty: number; contestIds: Set<string> }
    >();

    for (const sub of submissions) {
      if (!userStats.has(sub.userId)) {
        userStats.set(sub.userId, {
          solvedCount: 0,
          totalPenalty: 0,
          contestIds: new Set(),
        });
      }
      const stat = userStats.get(sub.userId)!;
      stat.solvedCount += 1;
      stat.totalPenalty += sub.penalty;
      stat.contestIds.add(sub.contestId);
    }

    // 计算 rating：通过题数 * 100 - 总罚时（简化公式）
    const userRatings = Array.from(userStats.entries()).map(
      ([userId, stat]) => ({
        userId,
        rating: Math.max(0, stat.solvedCount * 100 - stat.totalPenalty),
        contestCount: stat.contestIds.size,
      }),
    );

    // 如果没有提交记录，也显示参加过竞赛的用户
    // 获取所有报名过竞赛的用户
    const registrations = await prisma.contestRegistration.findMany({
      select: { userId: true, contestId: true },
    });

    const allContestUsers = new Map<string, Set<string>>();
    for (const reg of registrations) {
      if (!allContestUsers.has(reg.userId)) {
        allContestUsers.set(reg.userId, new Set());
      }
      allContestUsers.get(reg.userId)!.add(reg.contestId);
    }

    // 合并：有提交记录的用 rating，只报名没提交的 rating=0
    const mergedMap = new Map<
      string,
      { rating: number; contestCount: number }
    >();

    for (const ur of userRatings) {
      mergedMap.set(ur.userId, {
        rating: ur.rating,
        contestCount: ur.contestCount,
      });
    }

    for (const [userId, contestIds] of allContestUsers.entries()) {
      if (!mergedMap.has(userId)) {
        mergedMap.set(userId, {
          rating: 0,
          contestCount: contestIds.size,
        });
      }
    }

    // 排序：rating 降序
    const sorted = Array.from(mergedMap.entries())
      .sort((a, b) => b[1].rating - a[1].rating)
      .slice(0, 10);

    if (sorted.length === 0) {
      return Response.json([]);
    }

    // 获取用户信息
    const userIds = sorted.map(([id]) => id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = sorted
      .map(([userId, stat]) => {
        const u = userMap.get(userId);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          rating: stat.rating,
          contestCount: stat.contestCount,
        };
      })
      .filter(Boolean);

    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}