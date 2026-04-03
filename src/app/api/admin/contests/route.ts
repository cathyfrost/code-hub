import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET — 竞赛列表
export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 20;

    const [contests, total] = await Promise.all([
      prisma.contest.findMany({
        include: {
          problems: {
            include: {
              quiz: { select: { id: true, title: true, difficulty: true } },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: { registrations: true, submissions: true },
          },
        },
        orderBy: { startTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contest.count(),
    ]);

    return Response.json({
      contests,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// POST — 创建竞赛
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
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
            quiz: { select: { id: true, title: true, difficulty: true } },
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