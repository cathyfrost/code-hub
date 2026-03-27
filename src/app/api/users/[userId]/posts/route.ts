import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        const cursor = req.nextUrl.searchParams.get("cursor") || undefined;

        const pageSize = 10;

        const { user } = await validateRequest();

        if (!user) {
            return Response.json({ error: "未授权" }, { status: 401 });
        }

        const posts = await prisma.post.findMany({
            where: { userId, isQuestion: false },
            include: getPostDataInclude(user.id),
            orderBy: { createAt: "desc" },
            take: pageSize + 1,
            cursor: cursor ? { id: cursor } : undefined,
        });

        const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;

        const data: PostsPage = {
            posts: posts.slice(0, pageSize),
            nextCursor,
        };

        return Response.json(data);
    } catch (error) {
        console.error(error);
        return Response.json({ error: "内部服务器错误" }, { status: 500 });
    }
}