import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const userId = user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // ============ 并行查询所有数据 ============
    const [
      // 基础统计
      totalPosts,
      totalLikesReceived,
      totalCommentsReceived,
      totalBookmarksReceived,
      totalFollowers,
      totalFollowing,

      // 我发出的互动
      totalLikesGiven,
      totalCommentsGiven,
      totalBookmarksGiven,

      // 题库统计
      totalQuizSubmissions,
      passedQuizSubmissions,
      quizSubmissions,

      // 笔记本统计
      totalNotebooks,
      totalNotebookFolders,

      // AI 对话统计
      totalAiConversations,
      totalAiMessages,

      // 最近30天每日发帖
      recentPosts,

      // 最近30天每日获得的点赞
      recentLikesReceived,

      // 最近30天每日获得的评论
      recentCommentsReceived,

      // 帖子标签分布
      userPosts,

      // 题库提交记录（含题目信息）
      quizSubmissionDetails,

      // 6个月内的活跃度数据（发帖+评论+点赞）
      activityPosts,
      activityComments,
      activityLikes,

      // 通知统计
      totalNotifications,
      unreadNotifications,

      // 最受欢迎的帖子 Top 5
      topPosts,

      // 粉丝增长（最近30天的关注者）
      recentFollowers,
    ] = await Promise.all([
      // 基础统计
      prisma.post.count({ where: { userId } }),
      prisma.like.count({
        where: { post: { userId } },
      }),
      prisma.comment.count({
        where: { post: { userId }, userId: { not: userId } },
      }),
      prisma.bookmark.count({
        where: { post: { userId } },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),

      // 我发出的
      prisma.like.count({ where: { userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId } }),

      // 题库
      prisma.quizSubmission.count({ where: { userId } }),
      prisma.quizSubmission.count({ where: { userId, passed: true } }),
      prisma.quizSubmission.findMany({
        where: { userId },
        select: {
          quizId: true,
          passed: true,
          language: true,
          createAt: true,
          quiz: {
            select: {
              difficulty: true,
              tags: true,
            },
          },
        },
        orderBy: { createAt: "desc" },
      }),

      // 笔记本
      prisma.notebook.count({ where: { userId } }),
      prisma.notebookFolder.count({ where: { userId } }),

      // AI
      prisma.aiConversation.count({ where: { userId } }),
      prisma.aiMessage.count({
        where: { conversation: { userId } },
      }),

      // 最近30天帖子
      prisma.post.findMany({
        where: { userId, createAt: { gte: thirtyDaysAgo } },
        select: { createAt: true },
        orderBy: { createAt: "asc" },
      }),

      // 最近30天获得的点赞
      // 最近30天获得的点赞
      prisma.like.findMany({
        where: {
          post: { userId, createAt: { gte: thirtyDaysAgo } },
        },
        select: {
          post: { select: { createAt: true } },
        },
      }),

      // 最近30天获得的评论
      prisma.comment.findMany({
        where: {
          post: { userId },
          createAt: { gte: thirtyDaysAgo },
          userId: { not: userId },
        },
        select: { createAt: true },
      }),

      // 所有帖子（取标签和代码块数）
      prisma.post.findMany({
        where: { userId },
        select: {
          tags: true,
          codeBlocks: true,
          difficulty: true,
          createAt: true,
          _count: { select: { likes: true, comments: true, bookmarks: true } },
        },
        orderBy: { createAt: "desc" },
      }),

      // 题库详情
      prisma.quizSubmission.findMany({
        where: { userId },
        select: {
          id: true,
          passed: true,
          language: true,
          createAt: true,
          quiz: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              tags: true,
            },
          },
        },
        orderBy: { createAt: "desc" },
      }),

      // 活跃度：6个月发帖
      prisma.post.findMany({
        where: { userId, createAt: { gte: sixMonthsAgo } },
        select: { createAt: true },
      }),
      // 活跃度：6个月评论
      prisma.comment.findMany({
        where: { userId, createAt: { gte: sixMonthsAgo } },
        select: { createAt: true },
      }),
      // 活跃度：6个月点赞
      prisma.like.findMany({
        where: { userId },
        select: {
          post: { select: { createAt: true } },
        },
      }),

      // 通知
      prisma.notification.count({ where: { recipientId: userId } }),
      prisma.notification.count({
        where: { recipientId: userId, read: false },
      }),

      // Top 帖子
      prisma.post.findMany({
        where: { userId },
        select: {
          id: true,
          content: true,
          createAt: true,
          _count: {
            select: { likes: true, comments: true, bookmarks: true },
          },
        },
        orderBy: { likes: { _count: "desc" } },
        take: 5,
      }),

      // 最近关注者
      prisma.follow.findMany({
        where: {
          followingId: userId,
        },
        select: {
          followerId: true,
          follower: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    // ============ 处理数据 ============

    // 1. 每日发帖趋势（最近30天）
    const dailyPostTrend = generateDailyTrend(
      recentPosts.map((p) => p.createAt),
      thirtyDaysAgo,
      now,
    );

    // 2. 标签分布
    const tagCount: Record<string, number> = {};
    userPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    const tagDistribution = Object.entries(tagCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    // 3. 题库难度分布
    const quizDifficultyMap: Record<string, { total: number; passed: number }> =
      {};
    quizSubmissions.forEach((sub) => {
      const diff = sub.quiz.difficulty;
      if (!quizDifficultyMap[diff]) {
        quizDifficultyMap[diff] = { total: 0, passed: 0 };
      }
      quizDifficultyMap[diff].total++;
      if (sub.passed) quizDifficultyMap[diff].passed++;
    });
    const quizDifficultyDistribution = Object.entries(quizDifficultyMap).map(
      ([difficulty, data]) => ({
        difficulty:
          difficulty === "easy"
            ? "简单"
            : difficulty === "medium"
              ? "中等"
              : "困难",
        total: data.total,
        passed: data.passed,
        rate: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0,
      }),
    );

    // 4. 编程语言使用分布
    const langCount: Record<string, number> = {};
    quizSubmissions.forEach((sub) => {
      langCount[sub.language] = (langCount[sub.language] || 0) + 1;
    });
    const languageDistribution = Object.entries(langCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 5. 活跃度热力图数据（最近180天）
    const activityMap: Record<string, number> = {};
    activityPosts.forEach((p) => {
      const key = p.createAt.toISOString().split("T")[0];
      activityMap[key] = (activityMap[key] || 0) + 2;
    });
    activityComments.forEach((c) => {
      const key = c.createAt.toISOString().split("T")[0];
      activityMap[key] = (activityMap[key] || 0) + 1;
    });

    activityLikes.forEach((l) => {
      if (l.post) {
        const key = l.post.createAt.toISOString().split("T")[0];
        activityMap[key] = (activityMap[key] || 0) + 1;
      }
    });

    const heatmapData = Object.entries(activityMap).map(([date, count]) => ({
      date,
      count,
    }));

    // 6. 技能雷达图（基于帖子标签和题库标签）
    const skillMap: Record<string, number> = {};
    userPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        const category = mapTagToSkill(tag);
        skillMap[category] = (skillMap[category] || 0) + 1;
      });
    });
    quizSubmissions.forEach((sub) => {
      sub.quiz.tags.forEach((tag) => {
        const category = mapTagToSkill(tag);
        skillMap[category] = (skillMap[category] || 0) + (sub.passed ? 2 : 1);
      });
    });
    const maxSkill = Math.max(...Object.values(skillMap), 1);
    const skillRadar = Object.entries(skillMap)
      .map(([skill, value]) => ({
        skill,
        value: Math.round((value / maxSkill) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 7. 互动效率（每篇帖子平均获得的互动）
    const avgLikesPerPost =
      totalPosts > 0 ? (totalLikesReceived / totalPosts).toFixed(1) : "0";
    const avgCommentsPerPost =
      totalPosts > 0 ? (totalCommentsReceived / totalPosts).toFixed(1) : "0";
    const avgBookmarksPerPost =
      totalPosts > 0 ? (totalBookmarksReceived / totalPosts).toFixed(1) : "0";

    // 8. 每周活跃天数
    const last7DaysActive = new Set([
      ...activityPosts
        .filter((p) => p.createAt >= sevenDaysAgo)
        .map((p) => p.createAt.toISOString().split("T")[0]),
      ...activityComments
        .filter((c) => c.createAt >= sevenDaysAgo)
        .map((c) => c.createAt.toISOString().split("T")[0]),
    ]).size;

    // 9. Top 帖子格式化
    const topPostsFormatted = topPosts.map((p) => ({
      id: p.id,
      content:
        p.content.substring(0, 80) + (p.content.length > 80 ? "..." : ""),
      likes: p._count.likes,
      comments: p._count.comments,
      bookmarks: p._count.bookmarks,
      total: p._count.likes + p._count.comments + p._count.bookmarks,
      createAt: p.createAt,
    }));

    // 10. 最近30天互动趋势
    const dailyCommentTrend = generateDailyTrend(
      recentCommentsReceived.map((c) => c.createAt),
      thirtyDaysAgo,
      now,
    );

    // 合并每日趋势
    // 每日点赞趋势
    const dailyLikeTrend = generateDailyTrend(
      recentLikesReceived.map((l) => l.post!.createAt),
      thirtyDaysAgo,
      now,
    );

    // 合并每日趋势
    const dailyTrend = dailyPostTrend.map((day, index) => ({
      date: day.date,
      label: day.label,
      posts: day.count,
      comments: dailyCommentTrend[index]?.count || 0,
      likes: dailyLikeTrend[index]?.count || 0,
    }));

    // 11. 帖子含代码比例
    const postsWithCode = userPosts.filter((p) => p.codeBlocks > 0).length;
    const codePostRatio =
      totalPosts > 0 ? Math.round((postsWithCode / totalPosts) * 100) : 0;

    // 12. 独立通过题目数
    const uniquePassedQuizIds = new Set(
      quizSubmissions.filter((s) => s.passed).map((s) => s.quizId),
    );

    return NextResponse.json({
      overview: {
        totalPosts,
        totalLikesReceived,
        totalCommentsReceived,
        totalBookmarksReceived,
        totalFollowers,
        totalFollowing,
        totalLikesGiven,
        totalCommentsGiven,
        totalBookmarksGiven,
        totalNotebooks,
        totalNotebookFolders,
        totalAiConversations,
        totalAiMessages,
        totalNotifications,
        unreadNotifications,
        avgLikesPerPost,
        avgCommentsPerPost,
        avgBookmarksPerPost,
        last7DaysActive,
        codePostRatio,
      },
      quiz: {
        totalSubmissions: totalQuizSubmissions,
        passedSubmissions: passedQuizSubmissions,
        uniquePassed: uniquePassedQuizIds.size,
        passRate:
          totalQuizSubmissions > 0
            ? Math.round((passedQuizSubmissions / totalQuizSubmissions) * 100)
            : 0,
        difficultyDistribution: quizDifficultyDistribution,
        languageDistribution,
        recentSubmissions: quizSubmissionDetails.slice(0, 10).map((s) => ({
          id: s.id,
          quizTitle: s.quiz.title,
          difficulty: s.quiz.difficulty,
          language: s.language,
          passed: s.passed,
          createAt: s.createAt,
        })),
      },
      trends: {
        dailyTrend,
      },
      distributions: {
        tagDistribution,
        skillRadar,
      },
      heatmap: heatmapData,
      topPosts: topPostsFormatted,
      recentFollowers: recentFollowers.map((f) => ({
        username: f.follower.username,
        displayName: f.follower.displayName,
        avatarUrl: f.follower.avatarUrl,
      })),
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "获取数据分析失败" }, { status: 500 });
  }
}

// ============ 辅助函数 ============

function generateDailyTrend(
  dates: Date[],
  start: Date,
  end: Date,
): { date: string; label: string; count: number }[] {
  const result: { date: string; label: string; count: number }[] = [];
  const countMap: Record<string, number> = {};

  dates.forEach((d) => {
    const key = d.toISOString().split("T")[0];
    countMap[key] = (countMap[key] || 0) + 1;
  });

  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    const month = current.getMonth() + 1;
    const day = current.getDate();
    result.push({
      date: key,
      label: `${month}/${day}`,
      count: countMap[key] || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function mapTagToSkill(tag: string): string {
  const lower = tag.toLowerCase();
  const mapping: Record<string, string[]> = {
    前端: [
      "javascript",
      "typescript",
      "react",
      "vue",
      "next",
      "css",
      "html",
      "tailwind",
      "前端",
      "nextjs",
      "angular",
      "svelte",
    ],
    后端: [
      "node",
      "java",
      "spring",
      "python",
      "go",
      "rust",
      "后端",
      "express",
      "nestjs",
      "django",
      "flask",
    ],
    算法: [
      "算法",
      "数据结构",
      "leetcode",
      "动态规划",
      "排序",
      "二分",
      "递归",
      "数组",
      "链表",
      "栈",
      "队列",
      "树",
      "图",
      "哈希",
      "双指针",
      "滑动窗口",
      "数学",
    ],
    数据库: [
      "sql",
      "mysql",
      "postgresql",
      "mongodb",
      "redis",
      "数据库",
      "prisma",
      "orm",
    ],
    DevOps: [
      "docker",
      "k8s",
      "kubernetes",
      "ci",
      "cd",
      "linux",
      "nginx",
      "aws",
      "部署",
      "运维",
    ],
    AI: [
      "ai",
      "机器学习",
      "深度学习",
      "pytorch",
      "tensorflow",
      "nlp",
      "大模型",
      "chatgpt",
    ],
    移动端: [
      "ios",
      "android",
      "flutter",
      "react native",
      "swift",
      "kotlin",
      "移动",
    ],
    工具: ["git", "vscode", "webpack", "vite", "工具", "效率"],
  };

  for (const [skill, keywords] of Object.entries(mapping)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return skill;
    }
  }
  return "其他";
}
