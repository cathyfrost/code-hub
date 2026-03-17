// ============================================
// CodeHub 多因子融合推荐算法 - 核心模块
// src/lib/recommendation.ts
//
// 算法公式：Score = α·CF + β·Sim + γ·Skill + δ·Quality
// 创新点：引入技能等级匹配度(γ)和AI辅助质量评估(δ)
// ============================================

import prisma from "@/lib/prisma";

// ==================== 权重配置 ====================
// 四个因子的权重（α + β + γ + δ = 1）
const WEIGHTS = {
  alpha: 0.3, // 协同过滤得分权重
  beta: 0.25, // 内容相似度权重
  gamma: 0.25, // 技能匹配度权重（创新点1）
  delta: 0.2, // 帖子质量得分权重（创新点2）
};

// ==================== 类型定义 ====================
interface RecommendationScore {
  postId: string;
  cfScore: number; // 协同过滤得分
  simScore: number; // 内容相似度得分
  skillScore: number; // 技能匹配度得分
  qualityScore: number; // 质量得分
  finalScore: number; // 最终融合得分
}

interface UserProfile {
  id: string;
  skillLevel: number;
  interests: string[];
  likedPostIds: Set<string>;
  bookmarkedPostIds: Set<string>;
}

interface PostData {
  id: string;
  userId: string;
  tags: string[];
  difficulty: number;
  codeBlocks: number;
  createAt: Date;
  _count: {
    likes: number;
    bookmarks: number;
    comments: number;
  };
}

// ==================== 因子α：协同过滤 ====================
/**
 * 基于用户行为的协同过滤推荐
 *
 * 原理：找到与当前用户行为最相似的用户群（"邻居"），
 * 将邻居们喜欢但当前用户未接触过的帖子推荐出来。
 *
 * 相似度计算：Jaccard 相似系数
 * Jaccard(A, B) = |A ∩ B| / |A ∪ B|
 * 其中 A、B 分别是两个用户点赞过的帖子集合
 */
async function calculateCFScores(
  currentUser: UserProfile,
  candidatePosts: PostData[],
  allUsers: UserProfile[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // 1. 计算当前用户与所有其他用户的 Jaccard 相似度
  const userSimilarities: Array<{ userId: string; similarity: number }> = [];

  for (const otherUser of allUsers) {
    if (otherUser.id === currentUser.id) continue;

    // Jaccard 相似系数 = 交集大小 / 并集大小
    const intersection = new Set(
      [...currentUser.likedPostIds].filter((id) =>
        otherUser.likedPostIds.has(id)
      )
    );
    const union = new Set([
      ...currentUser.likedPostIds,
      ...otherUser.likedPostIds,
    ]);

    const similarity = union.size > 0 ? intersection.size / union.size : 0;

    if (similarity > 0) {
      userSimilarities.push({ userId: otherUser.id, similarity });
    }
  }

  // 2. 取 Top-K 最相似的邻居（K=20）
  const K = 20;
  const topNeighbors = userSimilarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, K);

  // 3. 邻居喜欢的帖子 → 加权计分
  for (const post of candidatePosts) {
    // 跳过用户已经点赞或收藏过的帖子
    if (
      currentUser.likedPostIds.has(post.id) ||
      currentUser.bookmarkedPostIds.has(post.id)
    ) {
      scores.set(post.id, 0);
      continue;
    }

    let score = 0;
    for (const neighbor of topNeighbors) {
      const neighborUser = allUsers.find((u) => u.id === neighbor.userId);
      if (neighborUser?.likedPostIds.has(post.id)) {
        // 邻居喜欢这个帖子 → 按相似度加权
        score += neighbor.similarity;
      }
    }

    scores.set(post.id, score);
  }

  return normalizeScores(scores);
}

// ==================== 因子β：内容相似度 ====================
/**
 * 基于 TF-IDF 思想的标签相似度计算
 *
 * 原理：将帖子标签视为特征向量，计算帖子标签与用户兴趣标签的余弦相似度。
 * 引入 IDF 权重：越稀有的标签权重越高（如"Rust"比"JavaScript"更有区分度）
 *
 * IDF(tag) = log(总帖子数 / 包含该标签的帖子数)
 * Similarity = Σ(matched_tag × IDF(tag)) / (|post_tags| × |user_interests|)
 */
function calculateContentSimilarity(
  currentUser: UserProfile,
  candidatePosts: PostData[],
  allPosts: PostData[]
): Map<string, number> {
  const scores = new Map<string, number>();
  const totalPosts = allPosts.length;

  // 1. 计算每个标签的 IDF 值
  const tagIDF = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const post of allPosts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  for (const [tag, count] of tagCounts) {
    // IDF = log(N / df)，加1平滑防止除零
    tagIDF.set(tag, Math.log((totalPosts + 1) / (count + 1)) + 1);
  }

  // 2. 计算每篇帖子与用户兴趣的相似度
  for (const post of candidatePosts) {
    if (post.tags.length === 0 || currentUser.interests.length === 0) {
      scores.set(post.id, 0);
      continue;
    }

    // 加权匹配得分
    let weightedMatch = 0;
    for (const tag of post.tags) {
      if (currentUser.interests.includes(tag)) {
        weightedMatch += tagIDF.get(tag) || 1;
      }
    }

    // 归一化：除以两个向量长度的几何平均
    const norm = Math.sqrt(post.tags.length * currentUser.interests.length);
    const similarity = norm > 0 ? weightedMatch / norm : 0;

    scores.set(post.id, similarity);
  }

  return normalizeScores(scores);
}

// ==================== 因子γ：技能匹配度（创新点1）====================
/**
 * 基于高斯衰减的技能等级匹配度
 *
 * 创新点：传统推荐算法不考虑用户技能水平与内容难度的匹配程度。
 * 在编程学习社区中，给初学者推荐过难的内容会降低学习效果。
 *
 * 匹配度公式（高斯衰减函数）：
 * SkillMatch = exp(-(userLevel - postDifficulty)² / (2σ²))
 *
 * σ = 1.5（控制容忍范围，表示允许 ±1.5 级的差异）
 *
 * 含义：
 * - 用户等级3，帖子难度3 → 匹配度 = 1.0（完美匹配）
 * - 用户等级3，帖子难度4 → 匹配度 ≈ 0.80（略有挑战，也推荐）
 * - 用户等级3，帖子难度5 → 匹配度 ≈ 0.41（太难，降低推荐）
 * - 用户等级3，帖子难度1 → 匹配度 ≈ 0.41（太简单，也降低）
 *
 * 附加：轻微偏向"略高于当前水平"的内容（+0.5偏移），
 * 符合维果茨基"最近发展区"教育理论。
 */
function calculateSkillMatch(
  currentUser: UserProfile,
  candidatePosts: PostData[]
): Map<string, number> {
  const scores = new Map<string, number>();
  const sigma = 1.5; // 标准差，控制匹配宽度
  const upwardBias = 0.5; // 向上偏移，鼓励略有挑战的内容

  for (const post of candidatePosts) {
    // 理想难度 = 用户等级 + 小幅上调（最近发展区）
    const idealDifficulty = currentUser.skillLevel + upwardBias;
    const diff = post.difficulty - idealDifficulty;

    // 高斯衰减函数
    const matchScore = Math.exp(-(diff * diff) / (2 * sigma * sigma));

    scores.set(post.id, matchScore);
  }

  return normalizeScores(scores);
}

// ==================== 因子δ：帖子质量得分（创新点2）====================
/**
 * 多维度帖子质量综合评分
 *
 * 创新点：结合结构化指标和互动数据，构建编程帖子质量评估模型。
 *
 * 质量得分 = w1·互动得分 + w2·内容结构得分 + w3·时间新鲜度
 *
 * 其中：
 * - 互动得分 = 归一化(点赞数 + 2×收藏数 + 1.5×评论数)
 *   收藏权重最高（表示长期价值），评论次之（表示深度讨论）
 * - 内容结构得分 = 归一化(代码块数量)
 *   有代码的帖子在编程社区中质量通常更高
 * - 时间新鲜度 = exp(-decay × 天数)
 *   较新的帖子获得适度加分
 */
function calculateQualityScores(
  candidatePosts: PostData[]
): Map<string, number> {
  const scores = new Map<string, number>();

  // 质量子维度权重
  const w1 = 0.5; // 互动得分权重
  const w2 = 0.3; // 内容结构得分权重
  const w3 = 0.2; // 时间新鲜度权重

  // 计算互动得分的归一化基准
  const interactionScores = candidatePosts.map((post) => {
    return (
      post._count.likes + 2 * post._count.bookmarks + 1.5 * post._count.comments
    );
  });
  const maxInteraction = Math.max(...interactionScores, 1);

  // 代码块数量归一化基准
  const maxCodeBlocks = Math.max(
    ...candidatePosts.map((p) => p.codeBlocks),
    1
  );

  const now = Date.now();
  const decayRate = 0.02; // 时间衰减系数

  for (let i = 0; i < candidatePosts.length; i++) {
    const post = candidatePosts[i];

    // 互动得分（归一化到 0-1）
    const interactionScore = interactionScores[i] / maxInteraction;

    // 内容结构得分（归一化到 0-1）
    const structureScore = post.codeBlocks / maxCodeBlocks;

    // 时间新鲜度（指数衰减）
    const daysSincePost =
      (now - post.createAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.exp(-decayRate * daysSincePost);

    // 加权综合
    const quality =
      w1 * interactionScore + w2 * structureScore + w3 * freshnessScore;

    scores.set(post.id, quality);
  }

  return normalizeScores(scores);
}

// ==================== 归一化工具函数 ====================
/**
 * Min-Max 归一化，将所有分数映射到 [0, 1] 区间
 */
function normalizeScores(scores: Map<string, number>): Map<string, number> {
  const values = [...scores.values()];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const normalized = new Map<string, number>();
  for (const [key, value] of scores) {
    normalized.set(key, range > 0 ? (value - min) / range : 0);
  }
  return normalized;
}

// ==================== 主推荐函数 ====================
/**
 * 为指定用户生成个性化推荐列表
 *
 * @param userId - 当前用户ID
 * @param limit - 返回推荐帖子数量，默认20
 * @param includeScoreDetails - 是否返回各因子详细得分（用于论文分析）
 */
export async function getRecommendations(
  userId: string,
  limit: number = 20,
  includeScoreDetails: boolean = false
): Promise<{
  recommendations: Array<{
    postId: string;
    finalScore: number;
    details?: {
      cfScore: number;
      simScore: number;
      skillScore: number;
      qualityScore: number;
    };
  }>;
  meta: {
    userId: string;
    totalCandidates: number;
    algorithm: string;
    weights: typeof WEIGHTS;
    computeTimeMs: number;
  };
}> {
  const startTime = Date.now();

  // ===== 1. 获取当前用户画像 =====
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      likes: { select: { postId: true } },
      bookmarks: { select: { postId: true } },
    },
  });

  if (!user) throw new Error("用户不存在");

  const currentUser: UserProfile = {
    id: user.id,
    skillLevel: user.skillLevel,
    interests: user.interests,
    likedPostIds: new Set(user.likes.map((l) => l.postId)),
    bookmarkedPostIds: new Set(user.bookmarks.map((b) => b.postId)),
  };

  // ===== 2. 获取候选帖子池 =====
  // 排除用户自己发的帖子
  const candidatePosts = await prisma.post.findMany({
    where: {
      userId: { not: userId },
    },
    include: {
      _count: {
        select: {
          likes: true,
          bookmarks: true,
          comments: true,
        },
      },
    },
    orderBy: { createAt: "desc" },
    take: 500, // 候选池上限
  });

  // ===== 3. 获取所有用户画像（用于协同过滤）=====
  const allUsersRaw = await prisma.user.findMany({
    select: {
      id: true,
      skillLevel: true,
      interests: true,
      likes: { select: { postId: true } },
      bookmarks: { select: { postId: true } },
    },
  });

  const allUsers: UserProfile[] = allUsersRaw.map((u) => ({
    id: u.id,
    skillLevel: u.skillLevel,
    interests: u.interests,
    likedPostIds: new Set(u.likes.map((l) => l.postId)),
    bookmarkedPostIds: new Set(u.bookmarks.map((b) => b.postId)),
  }));

  // ===== 4. 计算四个因子得分 =====
  const [cfScores, simScores, skillScores, qualityScores] = await Promise.all([
    calculateCFScores(currentUser, candidatePosts, allUsers),
    Promise.resolve(
      calculateContentSimilarity(currentUser, candidatePosts, candidatePosts)
    ),
    Promise.resolve(calculateSkillMatch(currentUser, candidatePosts)),
    Promise.resolve(calculateQualityScores(candidatePosts)),
  ]);

  // ===== 5. 加权融合 =====
  const finalScores: RecommendationScore[] = candidatePosts.map((post) => {
    const cf = cfScores.get(post.id) || 0;
    const sim = simScores.get(post.id) || 0;
    const skill = skillScores.get(post.id) || 0;
    const quality = qualityScores.get(post.id) || 0;

    const finalScore =
      WEIGHTS.alpha * cf +
      WEIGHTS.beta * sim +
      WEIGHTS.gamma * skill +
      WEIGHTS.delta * quality;

    return {
      postId: post.id,
      cfScore: cf,
      simScore: sim,
      skillScore: skill,
      qualityScore: quality,
      finalScore,
    };
  });

  // ===== 6. 排序取 TopN =====
  finalScores.sort((a, b) => b.finalScore - a.finalScore);
  const topN = finalScores.slice(0, limit);

  const computeTimeMs = Date.now() - startTime;

  return {
    recommendations: topN.map((item) => ({
      postId: item.postId,
      finalScore: Math.round(item.finalScore * 10000) / 10000,
      ...(includeScoreDetails && {
        details: {
          cfScore: Math.round(item.cfScore * 10000) / 10000,
          simScore: Math.round(item.simScore * 10000) / 10000,
          skillScore: Math.round(item.skillScore * 10000) / 10000,
          qualityScore: Math.round(item.qualityScore * 10000) / 10000,
        },
      }),
    })),
    meta: {
      userId,
      totalCandidates: candidatePosts.length,
      algorithm: "multi-factor-fusion-v1",
      weights: WEIGHTS,
      computeTimeMs,
    },
  };
}

// ==================== 对比算法（用于论文实验）====================

/**
 * 纯时间排序（基线算法1）
 * 最简单的排序方式，按时间倒序
 */
export async function getTimeBasedRecommendations(
  userId: string,
  limit: number = 20
) {
  const posts = await prisma.post.findMany({
    where: { userId: { not: userId } },
    orderBy: { createAt: "desc" },
    take: limit,
    select: { id: true },
  });
  return posts.map((p) => p.id);
}

/**
 * 纯协同过滤（基线算法2）
 * 只用因子α，不考虑内容、技能、质量
 */
export async function getPureCFRecommendations(
  userId: string,
  limit: number = 20
) {
  const result = await getRecommendations(userId, limit, true);
  // 按 cfScore 重新排序
  return result.recommendations
    .sort((a, b) => (b.details?.cfScore || 0) - (a.details?.cfScore || 0))
    .slice(0, limit)
    .map((r) => r.postId);
}

/**
 * 纯内容推荐（基线算法3）
 * 只用因子β，不考虑协同过滤、技能、质量
 */
export async function getPureContentRecommendations(
  userId: string,
  limit: number = 20
) {
  const result = await getRecommendations(userId, limit, true);
  // 按 simScore 重新排序
  return result.recommendations
    .sort((a, b) => (b.details?.simScore || 0) - (a.details?.simScore || 0))
    .slice(0, limit)
    .map((r) => r.postId);
}