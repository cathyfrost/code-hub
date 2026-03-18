// ============================================
// 推荐算法对比实验分析脚本
// scripts/analyze-recommendation.ts
//
// 用法：npx tsx scripts/analyze-recommendation.ts
// 功能：运行四种算法对比实验，输出论文用的表格数据和图表数据
// ============================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== 权重配置（与主算法一致）====================
const WEIGHTS = {
  alpha: 0.3,
  beta: 0.25,
  gamma: 0.25,
  delta: 0.2,
};

// ==================== 类型定义 ====================
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
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
}

// ==================== 四种推荐算法 ====================

/**
 * 算法1：纯时间排序（基线）
 * 最简单的排序方式，按发布时间倒序
 */
function timeBasedRecommend(
  userId: string,
  allPosts: PostData[],
  limit: number
): string[] {
  return allPosts
    .filter((p) => p.userId !== userId)
    .sort((a, b) => b.createAt.getTime() - a.createAt.getTime())
    .slice(0, limit)
    .map((p) => p.id);
}

/**
 * 算法2：纯协同过滤（基线）
 * 只看"相似用户喜欢什么"
 */
function pureCFRecommend(
  currentUser: UserProfile,
  allUsers: UserProfile[],
  allPosts: PostData[],
  limit: number
): string[] {
  const similarities: Array<{ userId: string; similarity: number }> = [];

  for (const other of allUsers) {
    if (other.id === currentUser.id) continue;
    const intersection = [...currentUser.likedPostIds].filter((id) =>
      other.likedPostIds.has(id)
    ).length;
    const union = new Set([
      ...currentUser.likedPostIds,
      ...other.likedPostIds,
    ]).size;
    const sim = union > 0 ? intersection / union : 0;
    if (sim > 0) similarities.push({ userId: other.id, similarity: sim });
  }

  const topNeighbors = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);

  const scores = new Map<string, number>();
  const candidates = allPosts.filter(
    (p) =>
      p.userId !== currentUser.id &&
      !currentUser.likedPostIds.has(p.id) &&
      !currentUser.bookmarkedPostIds.has(p.id)
  );

  for (const post of candidates) {
    let score = 0;
    for (const neighbor of topNeighbors) {
      const neighborUser = allUsers.find((u) => u.id === neighbor.userId);
      if (neighborUser?.likedPostIds.has(post.id)) {
        score += neighbor.similarity;
      }
    }
    scores.set(post.id, score);
  }

  return candidates
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
    .slice(0, limit)
    .map((p) => p.id);
}

/**
 * 算法3：纯内容推荐（基线）
 * 只看"帖子内容和用户兴趣匹不匹配"
 */
function pureContentRecommend(
  currentUser: UserProfile,
  allPosts: PostData[],
  limit: number
): string[] {
  const tagCounts = new Map<string, number>();
  for (const post of allPosts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const totalPosts = allPosts.length;
  const tagIDF = new Map<string, number>();
  for (const [tag, count] of tagCounts) {
    tagIDF.set(tag, Math.log((totalPosts + 1) / (count + 1)) + 1);
  }

  let userNormSq = 0;
  for (const tag of currentUser.interests) {
    const idf = tagIDF.get(tag) || 1;
    userNormSq += idf * idf;
  }
  const userNorm = Math.sqrt(userNormSq);

  const scores = new Map<string, number>();
  const candidates = allPosts.filter((p) => p.userId !== currentUser.id);

  for (const post of candidates) {
    if (post.tags.length === 0 || currentUser.interests.length === 0) {
      scores.set(post.id, 0);
      continue;
    }

    let dotProduct = 0;
    for (const tag of post.tags) {
      if (currentUser.interests.includes(tag)) {
        const idf = tagIDF.get(tag) || 1;
        dotProduct += idf * idf;
      }
    }

    let postNormSq = 0;
    for (const tag of post.tags) {
      const idf = tagIDF.get(tag) || 1;
      postNormSq += idf * idf;
    }
    const postNorm = Math.sqrt(postNormSq);

    const denom = userNorm * postNorm;
    scores.set(post.id, denom > 0 ? dotProduct / denom : 0);
  }

  return candidates
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
    .slice(0, limit)
    .map((p) => p.id);
}

/**
 * 算法4：本文提出的多因子融合算法
 * Score = α·CF + β·Sim + γ·SkillMatch + δ·Quality
 */
function multifactorRecommend(
  currentUser: UserProfile,
  allUsers: UserProfile[],
  allPosts: PostData[],
  limit: number
): {
  postIds: string[];
  details: Map<string, { cf: number; sim: number; skill: number; quality: number; final: number }>;
} {
  const candidates = allPosts.filter((p) => p.userId !== currentUser.id);

  // --- 因子α：协同过滤 ---
  const similarities: Array<{ userId: string; similarity: number }> = [];
  for (const other of allUsers) {
    if (other.id === currentUser.id) continue;
    const intersection = [...currentUser.likedPostIds].filter((id) =>
      other.likedPostIds.has(id)
    ).length;
    const union = new Set([
      ...currentUser.likedPostIds,
      ...other.likedPostIds,
    ]).size;
    const sim = union > 0 ? intersection / union : 0;
    if (sim > 0) similarities.push({ userId: other.id, similarity: sim });
  }
  const topNeighbors = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);

  const cfScores = new Map<string, number>();
  for (const post of candidates) {
    if (
      currentUser.likedPostIds.has(post.id) ||
      currentUser.bookmarkedPostIds.has(post.id)
    ) {
      cfScores.set(post.id, 0);
      continue;
    }
    let score = 0;
    for (const neighbor of topNeighbors) {
      const nu = allUsers.find((u) => u.id === neighbor.userId);
      if (nu?.likedPostIds.has(post.id)) score += neighbor.similarity;
    }
    cfScores.set(post.id, score);
  }

  // --- 因子β：内容相似度（TF-IDF + 余弦） ---
  const tagCounts = new Map<string, number>();
  for (const post of allPosts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const totalPosts = allPosts.length;
  const tagIDF = new Map<string, number>();
  for (const [tag, count] of tagCounts) {
    tagIDF.set(tag, Math.log((totalPosts + 1) / (count + 1)) + 1);
  }

  let userNormSq = 0;
  for (const tag of currentUser.interests) {
    const idf = tagIDF.get(tag) || 1;
    userNormSq += idf * idf;
  }
  const userNorm = Math.sqrt(userNormSq);

  const simScores = new Map<string, number>();
  for (const post of candidates) {
    if (post.tags.length === 0 || currentUser.interests.length === 0) {
      simScores.set(post.id, 0);
      continue;
    }
    let dotProduct = 0;
    for (const tag of post.tags) {
      if (currentUser.interests.includes(tag)) {
        const idf = tagIDF.get(tag) || 1;
        dotProduct += idf * idf;
      }
    }
    let postNormSq = 0;
    for (const tag of post.tags) {
      const idf = tagIDF.get(tag) || 1;
      postNormSq += idf * idf;
    }
    const postNorm = Math.sqrt(postNormSq);
    const denom = userNorm * postNorm;
    simScores.set(post.id, denom > 0 ? dotProduct / denom : 0);
  }

  // --- 因子γ：技能匹配度（高斯衰减 + 最近发展区）---
  const sigma = 1.5;
  const upwardBias = 0.5;
  const skillScores = new Map<string, number>();
  for (const post of candidates) {
    const idealDiff = currentUser.skillLevel + upwardBias;
    const diff = post.difficulty - idealDiff;
    skillScores.set(post.id, Math.exp(-(diff * diff) / (2 * sigma * sigma)));
  }

  // --- 因子δ：帖子质量评分 ---
  const interactionRaw = candidates.map(
    (p) => p.likeCount + 2 * p.bookmarkCount + 1.5 * p.commentCount
  );
  const maxInteraction = Math.max(...interactionRaw, 1);
  const maxCodeBlocks = Math.max(...candidates.map((p) => p.codeBlocks), 1);
  const now = Date.now();
  const decayRate = 0.02;

  const qualityScores = new Map<string, number>();
  for (let i = 0; i < candidates.length; i++) {
    const post = candidates[i];
    const interaction = interactionRaw[i] / maxInteraction;
    const structure = post.codeBlocks / maxCodeBlocks;
    const days = (now - post.createAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshness = Math.exp(-decayRate * days);
    qualityScores.set(
      post.id,
      0.5 * interaction + 0.3 * structure + 0.2 * freshness
    );
  }

  // --- 归一化 ---
  function normalize(scores: Map<string, number>): Map<string, number> {
    const values = [...scores.values()];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const result = new Map<string, number>();
    for (const [k, v] of scores) {
      result.set(k, range > 0 ? (v - min) / range : 0);
    }
    return result;
  }

  const normCF = normalize(cfScores);
  const normSim = normalize(simScores);
  const normSkill = normalize(skillScores);
  const normQuality = normalize(qualityScores);

  // --- 融合 ---
  const details = new Map<
    string,
    { cf: number; sim: number; skill: number; quality: number; final: number }
  >();

  for (const post of candidates) {
    const cf = normCF.get(post.id) || 0;
    const sim = normSim.get(post.id) || 0;
    const skill = normSkill.get(post.id) || 0;
    const quality = normQuality.get(post.id) || 0;
    const final_ =
      WEIGHTS.alpha * cf +
      WEIGHTS.beta * sim +
      WEIGHTS.gamma * skill +
      WEIGHTS.delta * quality;
    details.set(post.id, { cf, sim, skill, quality, final: final_ });
  }

  const sorted = candidates
    .sort(
      (a, b) =>
        (details.get(b.id)?.final || 0) - (details.get(a.id)?.final || 0)
    )
    .slice(0, limit);

  return { postIds: sorted.map((p) => p.id), details };
}

// ==================== 评估指标 ====================

function precisionAtK(
  recommended: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = recommended.slice(0, k);
  const hits = topK.filter((id) => relevant.has(id)).length;
  return hits / k;
}

function recallAtK(
  recommended: string[],
  relevant: Set<string>,
  k: number
): number {
  if (relevant.size === 0) return 0;
  const topK = recommended.slice(0, k);
  const hits = topK.filter((id) => relevant.has(id)).length;
  return hits / relevant.size;
}

function difficultyMatchRate(
  recommendedIds: string[],
  allPosts: PostData[],
  userLevel: number
): number {
  if (recommendedIds.length === 0) return 0;
  const postMap = new Map(allPosts.map((p) => [p.id, p]));
  const matched = recommendedIds.filter((id) => {
    const post = postMap.get(id);
    return post && Math.abs(post.difficulty - userLevel) <= 1;
  }).length;
  return matched / recommendedIds.length;
}

function tagCoverage(
  recommendedIds: string[],
  allPosts: PostData[],
  allTags: Set<string>
): number {
  const postMap = new Map(allPosts.map((p) => [p.id, p]));
  const covered = new Set<string>();
  for (const id of recommendedIds) {
    const post = postMap.get(id);
    if (post) {
      for (const tag of post.tags) covered.add(tag);
    }
  }
  return covered.size / allTags.size;
}

// ==================== 主实验函数 ====================

async function runExperiment() {
  console.log("🔬 推荐算法对比实验");
  console.log("=".repeat(70));
  console.log();

  // 加载所有数据
  console.log("📦 加载数据...");

  const allPostsRaw = await prisma.post.findMany({
    select: {
      id: true,
      userId: true,
      tags: true,
      difficulty: true,
      codeBlocks: true,
      createAt: true,
      _count: { select: { likes: true, bookmarks: true, comments: true } },
    },
  });

  const allPosts: PostData[] = allPostsRaw.map((p) => ({
    id: p.id,
    userId: p.userId,
    tags: p.tags,
    difficulty: p.difficulty,
    codeBlocks: p.codeBlocks,
    createAt: p.createAt,
    likeCount: p._count.likes,
    bookmarkCount: p._count.bookmarks,
    commentCount: p._count.comments,
  }));

  const allUsersRaw = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
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

  const allTags = new Set(allPosts.flatMap((p) => p.tags));

  // 选取有足够互动数据的测试用户（至少点赞过3篇且有兴趣标签）
  const testUsers = allUsersRaw.filter(
    (u) => u.likes.length >= 3 && u.interests.length > 0
  );

  console.log(`  帖子总数: ${allPosts.length}`);
  console.log(`  用户总数: ${allUsersRaw.length}`);
  console.log(`  测试用户: ${testUsers.length} (点赞≥3且有兴趣标签)`);
  console.log(`  标签种类: ${allTags.size}`);
  console.log();

  const K = 10;

  // 四种算法的结果
  const results = {
    timeBased: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
    pureCF: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
    pureContent: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
    multiFactor: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
  };

  const factorSums = { cf: 0, sim: 0, skill: 0, quality: 0, count: 0 };

  console.log(`🏃 对 ${testUsers.length} 个用户运行四种算法 (Top${K})...`);

  for (let idx = 0; idx < testUsers.length; idx++) {
    const rawUser = testUsers[idx];
    const user = allUsers.find((u) => u.id === rawUser.id)!;

    const relevant = new Set(
      allPosts
        .filter(
          (p) =>
            p.userId !== user.id &&
            p.tags.some((t) => user.interests.includes(t))
        )
        .map((p) => p.id)
    );

    // 1. 时间排序
    const timeRec = timeBasedRecommend(user.id, allPosts, K);
    results.timeBased.precision.push(precisionAtK(timeRec, relevant, K));
    results.timeBased.recall.push(recallAtK(timeRec, relevant, K));
    results.timeBased.diffMatch.push(difficultyMatchRate(timeRec, allPosts, user.skillLevel));
    results.timeBased.coverage.push(tagCoverage(timeRec, allPosts, allTags));

    // 2. 纯协同过滤
    const cfRec = pureCFRecommend(user, allUsers, allPosts, K);
    results.pureCF.precision.push(precisionAtK(cfRec, relevant, K));
    results.pureCF.recall.push(recallAtK(cfRec, relevant, K));
    results.pureCF.diffMatch.push(difficultyMatchRate(cfRec, allPosts, user.skillLevel));
    results.pureCF.coverage.push(tagCoverage(cfRec, allPosts, allTags));

    // 3. 纯内容推荐
    const contentRec = pureContentRecommend(user, allPosts, K);
    results.pureContent.precision.push(precisionAtK(contentRec, relevant, K));
    results.pureContent.recall.push(recallAtK(contentRec, relevant, K));
    results.pureContent.diffMatch.push(difficultyMatchRate(contentRec, allPosts, user.skillLevel));
    results.pureContent.coverage.push(tagCoverage(contentRec, allPosts, allTags));

    // 4. 本文多因子融合算法
    const mfResult = multifactorRecommend(user, allUsers, allPosts, K);
    results.multiFactor.precision.push(precisionAtK(mfResult.postIds, relevant, K));
    results.multiFactor.recall.push(recallAtK(mfResult.postIds, relevant, K));
    results.multiFactor.diffMatch.push(difficultyMatchRate(mfResult.postIds, allPosts, user.skillLevel));
    results.multiFactor.coverage.push(tagCoverage(mfResult.postIds, allPosts, allTags));

    for (const postId of mfResult.postIds) {
      const d = mfResult.details.get(postId);
      if (d) {
        factorSums.cf += d.cf;
        factorSums.sim += d.sim;
        factorSums.skill += d.skill;
        factorSums.quality += d.quality;
        factorSums.count++;
      }
    }

    if ((idx + 1) % 10 === 0 || idx === testUsers.length - 1) {
      process.stdout.write(`  已完成 ${idx + 1}/${testUsers.length}\r`);
    }
  }

  console.log("\n");

  // ==================== 输出结果 ====================

  const avg = (arr: number[]) =>
    arr.length > 0
      ? (arr.reduce((a, b) => a + b, 0) / arr.length) * 100
      : 0;

  const fmt = (n: number) => n.toFixed(2) + "%";

  // 表1：四种算法对比
  console.log("=".repeat(70));
  console.log("📊 表1：推荐算法对比实验结果（Top10，所有测试用户平均值）");
  console.log("=".repeat(70));
  console.log();
  console.log(
    "算法".padEnd(22) +
      "Precision@10".padEnd(16) +
      "Recall@10".padEnd(16) +
      "难度匹配率".padEnd(16) +
      "标签覆盖率".padEnd(16)
  );
  console.log("-".repeat(70));

  const algorithms = [
    { name: "时间排序（基线1）", data: results.timeBased },
    { name: "协同过滤（基线2）", data: results.pureCF },
    { name: "内容推荐（基线3）", data: results.pureContent },
    { name: "本文算法 ★", data: results.multiFactor },
  ];

  for (const algo of algorithms) {
    console.log(
      algo.name.padEnd(22) +
        fmt(avg(algo.data.precision)).padEnd(16) +
        fmt(avg(algo.data.recall)).padEnd(16) +
        fmt(avg(algo.data.diffMatch)).padEnd(16) +
        fmt(avg(algo.data.coverage)).padEnd(16)
    );
  }

  console.log("-".repeat(70));

  const mfPrec = avg(results.multiFactor.precision);
  const basePrec = avg(results.timeBased.precision);
  const mfDiff = avg(results.multiFactor.diffMatch);
  const baseDiff = avg(results.timeBased.diffMatch);

  console.log();
  console.log("📈 本文算法相比时间排序基线：");
  console.log(
    `   Precision 提升: ${basePrec > 0 ? (((mfPrec - basePrec) / basePrec) * 100).toFixed(1) : "N/A"}%`
  );
  console.log(
    `   难度匹配率提升: ${baseDiff > 0 ? (((mfDiff - baseDiff) / baseDiff) * 100).toFixed(1) : "N/A"}%`
  );

  // 表2：各因子平均贡献度（雷达图数据）
  console.log();
  console.log("=".repeat(70));
  console.log("📊 表2：本文算法各因子平均得分（用于雷达图）");
  console.log("=".repeat(70));
  console.log();

  const count = factorSums.count || 1;
  console.log(`  协同过滤因子 (α=0.3):  ${(factorSums.cf / count).toFixed(4)}`);
  console.log(`  内容相似因子 (β=0.25): ${(factorSums.sim / count).toFixed(4)}`);
  console.log(`  技能匹配因子 (γ=0.25): ${(factorSums.skill / count).toFixed(4)}`);
  console.log(`  质量评估因子 (δ=0.2):  ${(factorSums.quality / count).toFixed(4)}`);

  // 表3：不同 K 值的 Precision 变化（折线图数据）
  console.log();
  console.log("=".repeat(70));
  console.log("📊 表3：不同 K 值下各算法 Precision 变化（用于折线图）");
  console.log("=".repeat(70));
  console.log();

  const K_VALUES = [5, 10, 15, 20];
  console.log(
    "K值".padEnd(8) +
      "时间排序".padEnd(14) +
      "协同过滤".padEnd(14) +
      "内容推荐".padEnd(14) +
      "本文算法".padEnd(14)
  );
  console.log("-".repeat(60));

  for (const k of K_VALUES) {
    const kResults = {
      time: [] as number[],
      cf: [] as number[],
      content: [] as number[],
      mf: [] as number[],
    };

    for (const rawUser of testUsers) {
      const user = allUsers.find((u) => u.id === rawUser.id)!;
      const relevant = new Set(
        allPosts
          .filter(
            (p) =>
              p.userId !== user.id &&
              p.tags.some((t) => user.interests.includes(t))
          )
          .map((p) => p.id)
      );

      const timeRec = timeBasedRecommend(user.id, allPosts, k);
      const cfRec = pureCFRecommend(user, allUsers, allPosts, k);
      const contentRec = pureContentRecommend(user, allPosts, k);
      const mfRec = multifactorRecommend(user, allUsers, allPosts, k);

      kResults.time.push(precisionAtK(timeRec, relevant, k));
      kResults.cf.push(precisionAtK(cfRec, relevant, k));
      kResults.content.push(precisionAtK(contentRec, relevant, k));
      kResults.mf.push(precisionAtK(mfRec.postIds, relevant, k));
    }

    console.log(
      `K=${k}`.padEnd(8) +
        fmt(avg(kResults.time)).padEnd(14) +
        fmt(avg(kResults.cf)).padEnd(14) +
        fmt(avg(kResults.content)).padEnd(14) +
        fmt(avg(kResults.mf)).padEnd(14)
    );
  }

  console.log("-".repeat(60));

  // 表4：不同技能等级用户的难度匹配率（分组柱状图数据）
  console.log();
  console.log("=".repeat(70));
  console.log("📊 表4：不同技能等级用户的难度匹配率对比（用于柱状图）");
  console.log("=".repeat(70));
  console.log();

  console.log(
    "用户等级".padEnd(12) +
      "时间排序".padEnd(14) +
      "协同过滤".padEnd(14) +
      "内容推荐".padEnd(14) +
      "本文算法".padEnd(14)
  );
  console.log("-".repeat(60));

  for (let level = 1; level <= 5; level++) {
    const levelUsers = testUsers.filter(
      (u) => allUsers.find((au) => au.id === u.id)?.skillLevel === level
    );

    if (levelUsers.length === 0) {
      console.log(`Lv${level}`.padEnd(12) + "无测试用户");
      continue;
    }

    const levelResults = {
      time: [] as number[],
      cf: [] as number[],
      content: [] as number[],
      mf: [] as number[],
    };

    for (const rawUser of levelUsers) {
      const user = allUsers.find((u) => u.id === rawUser.id)!;

      const timeRec = timeBasedRecommend(user.id, allPosts, K);
      const cfRec = pureCFRecommend(user, allUsers, allPosts, K);
      const contentRec = pureContentRecommend(user, allPosts, K);
      const mfRec = multifactorRecommend(user, allUsers, allPosts, K);

      levelResults.time.push(difficultyMatchRate(timeRec, allPosts, user.skillLevel));
      levelResults.cf.push(difficultyMatchRate(cfRec, allPosts, user.skillLevel));
      levelResults.content.push(difficultyMatchRate(contentRec, allPosts, user.skillLevel));
      levelResults.mf.push(difficultyMatchRate(mfRec.postIds, allPosts, user.skillLevel));
    }

    console.log(
      `Lv${level} (${levelUsers.length}人)`.padEnd(12) +
        fmt(avg(levelResults.time)).padEnd(14) +
        fmt(avg(levelResults.cf)).padEnd(14) +
        fmt(avg(levelResults.content)).padEnd(14) +
        fmt(avg(levelResults.mf)).padEnd(14)
    );
  }

  console.log("-".repeat(60));

  console.log("\n🎉 实验完成！以上数据可直接用于论文的实验分析章节。");
  console.log("   表1 → 算法对比总表");
  console.log("   表2 → 各因子贡献雷达图");
  console.log("   表3 → Precision@K 折线图");
  console.log("   表4 → 分等级难度匹配柱状图");
}

runExperiment()
  .catch((e) => {
    console.error("❌ 实验失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());