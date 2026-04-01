import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

function computeStatus(startTime: Date, endTime: Date): "UPCOMING" | "RUNNING" | "ENDED" {
  const now = new Date();
  if (now < startTime) return "UPCOMING";
  if (now > endTime) return "ENDED";
  return "RUNNING";
}

// GET /api/contest — 获取竞赛列表
export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const contests = await prisma.contest.findMany({
      orderBy: { startTime: "desc" },
      include: {
        problems: {
          include: {
            quiz: {
              select: { id: true, title: true, difficulty: true },
            },
          },
          orderBy: { order: "asc" },
        },
        registrations: {
          where: { userId: user.id },
          select: { id: true },
        },
        _count: {
          select: {
            registrations: true,
            submissions: true,
          },
        },
      },
    });

    const data = contests.map((c) => ({
      ...c,
      status: computeStatus(c.startTime, c.endTime),
      isRegistered: c.registrations.length > 0,
      registrations: undefined,
    }));

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// POST /api/contest — 创建竞赛（管理员）
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { title, description, startTime, endTime, quizIds } =
      await req.json();

    if (!title || !startTime || !endTime || !quizIds?.length) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const contest = await prisma.contest.create({
      data: {
        title,
        description: description || "",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        problems: {
          create: quizIds.map((quizId: string, index: number) => ({
            quizId,
            order: index,
            score: 100,
          })),
        },
      },
      include: {
        problems: {
          include: {
            quiz: {
              select: { id: true, title: true, difficulty: true },
            },
          },
        },
      },
    });

    return Response.json(contest);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}