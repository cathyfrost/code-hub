import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    await prisma.notification.updateMany({
        where: {
            recipientId: user.id,
            read: false
        },
        data: {
            read: true,
        }
    });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
