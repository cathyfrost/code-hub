// src/app/api/recommendations/route.ts
import { validateRequest } from "@/auth";
import { getRecommendations } from "@/lib/recommendation";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";

// GET /api/recommendations?limit=20&details=true
export async function GET(req: Request) {
  try {
    // 1. 验证登录状态
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    // 2. 解析参数
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const includeDetails = searchParams.get("details") === "true";

    // 3. 调用推荐算法
    const result = await getRecommendations(user.id, limit, includeDetails);

    // 4. 用 getPostDataInclude 查询完整帖子数据（和 ForYouFeed 一致）
    const postIds = result.recommendations.map((r) => r.postId);

    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      include: getPostDataInclude(user.id),
    });

    // 5. 按推荐分数排序
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const orderedPosts = result.recommendations
      .map((rec) => {
        const post = postMap.get(rec.postId);
        if (!post) return null;
        return post;
      })
      .filter(Boolean);

    return Response.json({
      posts: orderedPosts,
      meta: result.meta,
    });
  } catch (error) {
    console.error("推荐算法错误:", error);
    return Response.json(
      { error: "推荐服务暂时不可用" },
      { status: 500 }
    );
  }
}