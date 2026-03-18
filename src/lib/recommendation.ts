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
  cfScore: number;
  simScore: number;
  skillScore: number;
  qualityScore: number;
  finalScore: number;
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

// ==================== 用户技能等级自动计算 ====================
/**
 * 根据用户行为自动计算技能等级（1-5）
 *
 * 评估维度：
 * - 发帖数量（权重2）：内容产出能力
 * - 代码块总数（权重3）：技术深度
 * - 被点赞数（权重1）：内容被认可度
 * - 被收藏数（权重2）：内容长期价值
 * - 发表评论数（权重1）：社区参与度
 *
 * 计算公式：
 * RawScore = posts×2 + codeBlocks×3 + likes×1 + bookmarks×2 + comments×1
 *
 * 分级标准：
 * Lv1: 0-10分 | Lv2: 11-30分 | Lv3: 31-60分 | Lv4: 61-100分 | Lv5: 100+分
 */
export async function calculateUserSkillLevel(
  userId: string
): Promise<number> {
  const postStats = await prisma.post.aggregate({
    where: { userId },
    _count: true,
    _sum: { codeBlocks: true },
  });

  const likeCount = await prisma.like.count({
    where: { post: { userId } },
  });

  const bookmarkCount = await prisma.bookmark.count({
    where: { post: { userId } },
  });

  const commentCount = await prisma.comment.count({
    where: { userId },
  });

  const rawScore =
    (postStats._count || 0) * 2 +
    (postStats._sum.codeBlocks || 0) * 3 +
    likeCount * 1 +
    bookmarkCount * 2 +
    commentCount * 1;

  if (rawScore <= 10) return 1;
  if (rawScore <= 30) return 2;
  if (rawScore <= 60) return 3;
  if (rawScore <= 100) return 4;
  return 5;
}

/**
 * 批量更新所有用户的技能等级
 */
export async function updateAllUserSkillLevels(): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  for (const user of users) {
    const level = await calculateUserSkillLevel(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { skillLevel: level },
    });
  }
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
 *
 * 协同过滤得分：
 * CF_Score(post) = Σ Jaccard(user, neighbor_k) × I(neighbor_k, post)
 * 其中 I = 1 表示邻居k点赞了该帖子，K = Top20 最相似邻居
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
        score += neighbor.similarity;
      }
    }

    scores.set(post.id, score);
  }

  return normalizeScores(scores);
}

// ==================== 因子β：内容相似度（TF-IDF + 余弦相似度）====================
/**
 * 基于 TF-IDF 加权的余弦相似度计算
 *
 * 原理：将用户兴趣标签和帖子标签分别构建为 TF-IDF 加权向量，
 * 通过余弦相似度衡量两个向量的方向接近程度。
 *
 * IDF(tag) = log((N + 1) / (df(tag) + 1)) + 1
 *   N = 总帖子数，df(tag) = 包含该标签的帖子数
 *
 * 用户兴趣向量：U = (IDF(t₁), IDF(t₂), ..., IDF(tₙ))  tᵢ ∈ 用户兴趣
 * 帖子标签向量：P = (IDF(t₁), IDF(t₂), ..., IDF(tₙ))  tᵢ ∈ 帖子标签
 *
 * 余弦相似度：
 * cos(U, P) = (U · P) / (|U| × |P|)
 *           = Σ(Uᵢ × Pᵢ) / (√Σ(Uᵢ²) × √Σ(Pᵢ²))
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
    tagIDF.set(tag, Math.log((totalPosts + 1) / (count + 1)) + 1);
  }

  // 2. 预计算用户兴趣向量的模长 |U| = √Σ(IDF(tᵢ)²)
  let userNormSquared = 0;
  for (const tag of currentUser.interests) {
    const idf = tagIDF.get(tag) || 1;
    userNormSquared += idf * idf;
  }
  const userNorm = Math.sqrt(userNormSquared);

  // 3. 计算每篇帖子与用户兴趣的余弦相似度
  for (const post of candidatePosts) {
    if (post.tags.length === 0 || currentUser.interests.length === 0) {
      scores.set(post.id, 0);
      continue;
    }

    // 分子：向量点积 U · P = Σ(IDF(tᵢ) × IDF(tᵢ))，仅对两边都有的标签求和
    let dotProduct = 0;
    for (const tag of post.tags) {
      if (currentUser.interests.includes(tag)) {
        const idf = tagIDF.get(tag) || 1;
        dotProduct += idf * idf;
      }
    }

    // 分母：帖子标签向量的模长 |P| = √Σ(IDF(tᵢ)²)
    let postNormSquared = 0;
    for (const tag of post.tags) {
      const idf = tagIDF.get(tag) || 1;
      postNormSquared += idf * idf;
    }
    const postNorm = Math.sqrt(postNormSquared);

    // cos(U, P) = (U · P) / (|U| × |P|)
    const denominator = userNorm * postNorm;
    const similarity = denominator > 0 ? dotProduct / denominator : 0;

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
 * 匹配度公式（高斯衰减函数 + 最近发展区偏移）：
 *
 * idealDifficulty = userLevel + δ    （δ = 0.5，最近发展区上偏移）
 *
 * SkillMatch = exp(-(postDifficulty - idealDifficulty)² / (2σ²))
 *
 * σ = 1.5（标准差，控制容忍范围）
 *
 * 含义：
 * - 用户Lv3，帖子D3 → 匹配度 ≈ 0.95（接近完美匹配）
 * - 用户Lv3，帖子D4 → 匹配度 ≈ 0.80（略有挑战，推荐）
 * - 用户Lv3，帖子D5 → 匹配度 ≈ 0.41（太难，降低推荐）
 * - 用户Lv3，帖子D1 → 匹配度 ≈ 0.41（太简单，也降低）
 */
function calculateSkillMatch(
  currentUser: UserProfile,
  candidatePosts: PostData[]
): Map<string, number> {
  const scores = new Map<string, number>();
  const sigma = 1.5;
  const upwardBias = 0.5;

  for (const post of candidatePosts) {
    const idealDifficulty = currentUser.skillLevel + upwardBias;
    const diff = post.difficulty - idealDifficulty;

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
 * Quality = w₁·InteractionScore + w₂·StructureScore + w₃·FreshnessScore
 *
 * InteractionScore = (likes + 2×bookmarks + 1.5×comments) / max_interaction
 *   收藏权重最高（×2，表示长期学习价值），评论次之（×1.5，表示深度讨论）
 *
 * StructureScore = codeBlocks / max_codeBlocks
 *   有代码的帖子在编程社区中质量通常更高
 *
 * FreshnessScore = exp(-λ × days)
 *   λ = 0.02，较新的帖子获得适度加分
 *
 * w₁ = 0.5，w₂ = 0.3，w₃ = 0.2
 */
function calculateQualityScores(
  candidatePosts: PostData[]
): Map<string, number> {
  const scores = new Map<string, number>();

  const w1 = 0.5;
  const w2 = 0.3;
  const w3 = 0.2;

  const interactionScores = candidatePosts.map((post) => {
    return (
      post._count.likes +
      2 * post._count.bookmarks +
      1.5 * post._count.comments
    );
  });
  const maxInteraction = Math.max(...interactionScores, 1);

  const maxCodeBlocks = Math.max(
    ...candidatePosts.map((p) => p.codeBlocks),
    1
  );

  const now = Date.now();
  const decayRate = 0.02;

  for (let i = 0; i < candidatePosts.length; i++) {
    const post = candidatePosts[i];

    const interactionScore = interactionScores[i] / maxInteraction;

    const structureScore = post.codeBlocks / maxCodeBlocks;

    const daysSincePost =
      (now - post.createAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.exp(-decayRate * daysSincePost);

    const quality =
      w1 * interactionScore + w2 * structureScore + w3 * freshnessScore;

    scores.set(post.id, quality);
  }

  return normalizeScores(scores);
}

// ==================== 归一化工具函数 ====================
/**
 * Min-Max 归一化，将所有分数映射到 [0, 1] 区间
 * Normalized(x) = (x - min) / (max - min)
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
 * 融合公式：
 * FinalScore = α×CF + β×Sim + γ×SkillMatch + δ×Quality
 * α=0.3, β=0.25, γ=0.25, δ=0.2
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

  // ===== 0. 自动更新当前用户技能等级 =====
  const freshLevel = await calculateUserSkillLevel(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { skillLevel: freshLevel },
  });

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
    skillLevel: freshLevel,
    interests: user.interests,
    likedPostIds: new Set(user.likes.map((l) => l.postId)),
    bookmarkedPostIds: new Set(user.bookmarks.map((b) => b.postId)),
  };

  // ===== 2. 获取候选帖子池 =====
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
    take: 500,
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