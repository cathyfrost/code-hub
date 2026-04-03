import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    const { postId } = await params;

    await prisma.post.delete({ where: { id: postId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}