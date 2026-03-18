import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const notebooks = await prisma.notebook.findMany({
      where: { userId: user.id },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    for (const nb of notebooks) {
      for (const tag of nb.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return Response.json(tags);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}