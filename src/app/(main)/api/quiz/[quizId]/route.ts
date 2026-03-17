import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { user } = await validateRequest();
    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        tags: true,
        examples: true,
        starterCode: true,
        hints: true,
        order: true,
      },
    });

    if (!quiz) {
      return Response.json({ error: "题目不存在" }, { status: 404 });
    }

    let passed = false;
    if (user) {
      const submission = await prisma.quizSubmission.findFirst({
        where: {
          userId: user.id,
          quizId,
          passed: true,
        },
      });
      passed = !!submission;
    }

    return Response.json({ ...quiz, passed });
  } catch (error) {
    console.error("获取题目详情失败:", error);
    return Response.json({ error: "获取题目详情失败" }, { status: 500 });
  }
}