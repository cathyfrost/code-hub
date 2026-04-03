import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH — 编辑竞赛
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const { contestId } = await params;
    const { title, description, startTime, endTime, quizIds } =
      await req.json();

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);

    const contest = await prisma.contest.update({
      where: { id: contestId },
      data: updateData,
    });

    // 如果传了 quizIds，重建题目关联
    if (quizIds?.length) {
      await prisma.contestProblem.deleteMany({
        where: { contestId },
      });
      await prisma.contestProblem.createMany({
        data: quizIds.map((quizId: string, index: number) => ({
          contestId,
          quizId,
          order: index,
          score: 100,
        })),
      });
    }

    return Response.json(contest);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// DELETE — 删除竞赛
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const { contestId } = await params;

    await prisma.contest.delete({ where: { id: contestId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}