import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";

// const LANGUAGE_MAP: Record<string, number> = {
//   c: 50,
//   cpp: 54,
//   java: 62,
//   javascript: 63,
//   typescript: 74,
//   python: 71,
//   go: 60,
//   rust: 73,
// };

const DIFFICULTY_TIME: Record<string, number> = {
  EASY: 900,
  MEDIUM: 1800,
  HARD: 2700,
};

// GET /api/challenge — 获取我的对战记录
export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ challengerId: user.id }, { opponentId: user.id }],
      },
      include: {
        challenger: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        opponent: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        quiz: {
          select: { id: true, title: true, difficulty: true },
        },
      },
      orderBy: { createAt: "desc" },
      take: 20,
    });

    return Response.json(challenges);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// POST /api/challenge — 发起匹配
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { difficulty } = await req.json();

    if (!difficulty || !DIFFICULTY_TIME[difficulty]) {
      return Response.json({ error: "无效的难度" }, { status: 400 });
    }

    // 查找是否有同难度的等待中的对战（不是自己发起的）
    const waiting = await prisma.challenge.findFirst({
      where: {
        difficulty,
        status: "MATCHING",
        challengerId: { not: user.id },
      },
      orderBy: { createAt: "asc" },
    });

    if (waiting) {
      // 匹配成功：随机选一道对应难度的题
      const difficultyMap: Record<string, string> = {
        EASY: "easy",
        MEDIUM: "medium",
        HARD: "hard",
      };

      const quizCount = await prisma.quiz.count({
        where: { difficulty: difficultyMap[difficulty] },
      });

      if (quizCount === 0) {
        return Response.json(
          { error: "该难度暂无题目" },
          { status: 400 },
        );
      }

      const randomSkip = Math.floor(Math.random() * quizCount);
      const quiz = await prisma.quiz.findFirst({
        where: { difficulty: difficultyMap[difficulty] },
        skip: randomSkip,
      });

      const challenge = await prisma.challenge.update({
        where: { id: waiting.id },
        data: {
          opponentId: user.id,
          quizId: quiz!.id,
          status: "ONGOING",
          startedAt: new Date(),
          timeLimit: DIFFICULTY_TIME[difficulty],
        },
        include: {
          challenger: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          opponent: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              description: true,
              examples: true,
              testCases: true,
              starterCode: true,
            },
          },
        },
      });

      return Response.json({ matched: true, challenge });
    }

    // 没有匹配到：创建新的等待
    const challenge = await prisma.challenge.create({
      data: {
        difficulty,
        challengerId: user.id,
        timeLimit: DIFFICULTY_TIME[difficulty],
      },
    });

    return Response.json({ matched: false, challenge });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
