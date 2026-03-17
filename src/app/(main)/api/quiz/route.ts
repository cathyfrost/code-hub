import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();

    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        order: true,
      },
      orderBy: { order: "asc" },
    });

    let passedQuizIds: Set<string> = new Set();
    if (user) {
      const passedSubmissions = await prisma.quizSubmission.findMany({
        where: {
          userId: user.id,
          passed: true,
        },
        select: { quizId: true },
        distinct: ["quizId"],
      });
      passedQuizIds = new Set(passedSubmissions.map((s) => s.quizId));
    }

    const result = quizzes.map((q) => ({
      ...q,
      passed: passedQuizIds.has(q.id),
    }));

    return Response.json(result);
  } catch (error) {
    console.error("获取题目列表失败:", error);
    return Response.json({ error: "获取题目列表失败" }, { status: 500 });
  }
}