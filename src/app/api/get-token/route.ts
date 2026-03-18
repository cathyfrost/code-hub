import { validateRequest } from "@/auth";
import streamServerClient from "@/lib/stream";

export async function GET() {
  try {
    const { user } = await validateRequest();

    console.log("为用户调用令牌：", user?.id);

    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60;

    const issuedAt = Math.floor(Date.now() / 1000) - 60;

    const token = streamServerClient.createToken(
      user.id,
      expirationTime,
      issuedAt,
    );

    return Response.json({ token });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
