import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
      },
      orderBy: { createAt: "desc" },
    });

    return Response.json(quizzes);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}