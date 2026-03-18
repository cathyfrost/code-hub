import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get("q") || "";

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: user.id } },
          q
            ? {
                OR: [
                  { displayName: { contains: q, mode: "insensitive" } },
                  { username: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      take: 15,
      orderBy: { displayName: "asc" },
    });

    return Response.json(users);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}