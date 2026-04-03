import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH — 封禁/解封用户
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const { userId } = await params;
    const { banned } = await req.json();

    if (userId === user.id) {
      return Response.json({ error: "不能操作自己" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { banned: Boolean(banned) },
      select: { id: true, username: true, banned: true },
    });

    return Response.json(updated);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// DELETE — 删除用户
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const { userId } = await params;

    if (userId === user.id) {
      return Response.json({ error: "不能删除自己" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}