import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/contest/[contestId]/submissions?quizId=xxx — 获取当前用户的提交记录
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { contestId } = await params;
    const quizId = req.nextUrl.searchParams.get("quizId");

    if (!quizId) {
      return Response.json({ error: "缺少 quizId" }, { status: 400 });
    }

    const submissions = await prisma.contestSubmission.findMany({
      where: {
        contestId,
        userId: user.id,
        quizId,
      },
      select: {
        id: true,
        passed: true,
        language: true,
        penalty: true,
        time: true,
        memory: true,
        createAt: true,
      },
      orderBy: { createAt: "desc" },
      take: 50,
    });

    return Response.json(submissions);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}