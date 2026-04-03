import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // ── 基础统计 ──
    const [
      userCount,
      todayUserCount,
      yesterdayUserCount,
      bannedUserCount,
      postCount,
      todayPostCount,
      yesterdayPostCount,
      questionCount,
      commentCount,
      todayCommentCount,
      contestCount,
      quizCount,
      notebookCount,
      aiConversationCount,
      totalLikes,
      totalBookmarks,
      totalFollows,
      totalViews,
      weeklyActiveUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.post.count(),
      prisma.post.count({ where: { createAt: { gte: todayStart } } }),
      prisma.post.count({ where: { createAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.post.count({ where: { isQuestion: true } }),
      prisma.comment.count(),
      prisma.comment.count({ where: { createAt: { gte: todayStart } } }),
      prisma.contest.count(),
      prisma.quiz.count(),
      prisma.notebook.count(),
      prisma.aiConversation.count(),
      prisma.like.count(),
      prisma.bookmark.count(),
      prisma.follow.count(),
      prisma.post.aggregate({ _sum: { viewCount: true } }),
      prisma.user.count({
        where: {
          posts: { some: { createAt: { gte: sevenDaysAgo } } },
        },
      }),
    ]);

    // ── 近30天每日注册趋势 ──
    const userGrowthRaw = await prisma.user.groupBy({
      by: ["createAt"],
      where: { createAt: { gte: thirtyDaysAgo } },
      _count: true,
      orderBy: { createAt: "asc" },
    });

    const userGrowth: { date: string; label: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const count = userGrowthRaw.filter(
        (r) => r.createAt.toISOString().split("T")[0] === dateStr,
      ).length;
      userGrowth.push({ date: dateStr, label, count });
    }

    // ── 近30天每日发帖趋势 ──
    const postTrendRaw = await prisma.post.groupBy({
      by: ["createAt"],
      where: { createAt: { gte: thirtyDaysAgo } },
      _count: true,
      orderBy: { createAt: "asc" },
    });

    // ── 近30天每日评论趋势 ──
    const commentTrendRaw = await prisma.comment.groupBy({
      by: ["createAt"],
      where: { createAt: { gte: thirtyDaysAgo } },
      _count: true,
      orderBy: { createAt: "asc" },
    });

    const dailyTrend: { date: string; label: string; posts: number; comments: number; users: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyTrend.push({
        date: dateStr,
        label,
        posts: postTrendRaw.filter((r) => r.createAt.toISOString().split("T")[0] === dateStr).length,
        comments: commentTrendRaw.filter((r) => r.createAt.toISOString().split("T")[0] === dateStr).length,
        users: userGrowthRaw.filter((r) => r.createAt.toISOString().split("T")[0] === dateStr).length,
      });
    }

    // ── 用户技能等级分布 ──
    const skillLevelRaw = await prisma.user.groupBy({
      by: ["skillLevel"],
      _count: true,
      orderBy: { skillLevel: "asc" },
    });
    const skillLevelLabels: Record<number, string> = {
      1: "入门",
      2: "初级",
      3: "中级",
      4: "高级",
      5: "专家",
    };
    const skillDistribution = skillLevelRaw.map((r) => ({
      name: skillLevelLabels[r.skillLevel] || `Lv${r.skillLevel}`,
      value: r._count,
      level: r.skillLevel,
    }));

    // ── 帖子类型分布 ──
    const questionPostCount = await prisma.post.count({ where: { isQuestion: true } });
    const normalPostCount = postCount - questionPostCount;
    const resolvedQuestionCount = await prisma.post.count({ where: { isQuestion: true, isResolved: true } });
    const postTypeDistribution = [
      { name: "普通帖子", value: normalPostCount },
      { name: "已解决问答", value: resolvedQuestionCount },
      { name: "未解决问答", value: questionPostCount - resolvedQuestionCount },
    ];

    // ── 题目难度分布 ──
    const quizDifficultyRaw = await prisma.quiz.groupBy({
      by: ["difficulty"],
      _count: true,
    });
    const difficultyMap: Record<string, string> = { easy: "简单", medium: "中等", hard: "困难" };
    const quizDifficultyDistribution = quizDifficultyRaw.map((r) => ({
      name: difficultyMap[r.difficulty] || r.difficulty,
      value: r._count,
      key: r.difficulty,
    }));

    // ── 题目提交统计 ──
    const totalSubmissions = await prisma.quizSubmission.count();
    const passedSubmissions = await prisma.quizSubmission.count({ where: { passed: true } });
    const quizPassRate = totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0;

    // ── 编程语言分布 ──
    const languageRaw = await prisma.quizSubmission.groupBy({
      by: ["language"],
      _count: true,
      orderBy: { _count: { language: "desc" } },
      take: 8,
    });
    const languageDistribution = languageRaw.map((r) => ({
      name: r.language,
      value: r._count,
    }));

    // ── 竞赛状态分布 ──
    const contestStatusRaw = await prisma.contest.groupBy({
      by: ["status"],
      _count: true,
    });
    const statusMap: Record<string, string> = { UPCOMING: "未开始", RUNNING: "进行中", ENDED: "已结束" };
    const contestStatusDistribution = contestStatusRaw.map((r) => ({
      name: statusMap[r.status] || r.status,
      value: r._count,
      key: r.status,
    }));

    // ── 竞赛参与趋势 ──
    const contestRegistrations = await prisma.contestRegistration.count();
    const contestSubmissions = await prisma.contestSubmission.count();

    // ── Top 10 活跃用户 ──
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        points: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            followers: true,
          },
        },
      },
      orderBy: { points: "desc" },
      take: 10,
    });

    // ── Top 10 热门帖子 ──
    const topPosts = await prisma.post.findMany({
      select: {
        id: true,
        content: true,
        viewCount: true,
        createAt: true,
        user: {
          select: {
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
      orderBy: { viewCount: "desc" },
      take: 10,
    });

    // ── 热门标签 ──
    const tagRaw = await prisma.postTag.groupBy({
      by: ["tagId"],
      _count: true,
      orderBy: { _count: { tagId: "desc" } },
      take: 10,
    });
    const tagIds = tagRaw.map((t) => t.tagId);
    const tags = tagIds.length > 0
      ? await prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, name: true } })
      : [];
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    const tagDistribution = tagRaw.map((t) => ({
      name: tagMap.get(t.tagId) || "未知",
      value: t._count,
    }));

    // ── 180天活跃热力图 ──
    const heatmapStart = new Date(now);
    heatmapStart.setDate(heatmapStart.getDate() - 180);
    const heatmapPostsRaw = await prisma.post.groupBy({
      by: ["createAt"],
      where: { createAt: { gte: heatmapStart } },
      _count: true,
    });
    const heatmapCommentsRaw = await prisma.comment.groupBy({
      by: ["createAt"],
      where: { createAt: { gte: heatmapStart } },
      _count: true,
    });
    const heatmapMap = new Map<string, number>();
    heatmapPostsRaw.forEach((r) => {
      const key = r.createAt.toISOString().split("T")[0];
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + r._count);
    });
    heatmapCommentsRaw.forEach((r) => {
      const key = r.createAt.toISOString().split("T")[0];
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + r._count);
    });
    const heatmap = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));

    // ── 1v1 对战统计 ──
    const totalChallenges = await prisma.challenge.count();
    const finishedChallenges = await prisma.challenge.count({ where: { status: "FINISHED" } });

    return Response.json({
      overview: {
        userCount,
        todayUserCount,
        yesterdayUserCount,
        bannedUserCount,
        postCount,
        todayPostCount,
        yesterdayPostCount,
        questionCount,
        commentCount,
        todayCommentCount,
        contestCount,
        quizCount,
        notebookCount,
        aiConversationCount,
        totalLikes,
        totalBookmarks,
        totalFollows,
        totalViews: totalViews._sum.viewCount || 0,
        weeklyActiveUsers,
        totalSubmissions,
        passedSubmissions,
        quizPassRate,
        contestRegistrations,
        contestSubmissions,
        totalChallenges,
        finishedChallenges,
      },
      trends: {
        dailyTrend,
        userGrowth,
      },
      distributions: {
        skillDistribution,
        postTypeDistribution,
        quizDifficultyDistribution,
        languageDistribution,
        contestStatusDistribution,
        tagDistribution,
      },
      rankings: {
        topUsers: topUsers.map((u) => ({
          ...u,
          totalActivity: u._count.posts + u._count.comments,
        })),
        topPosts: topPosts.map((p) => ({
          ...p,
          totalInteraction: p._count.likes + p._count.comments + p._count.bookmarks,
        })),
      },
      heatmap,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}