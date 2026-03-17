// ============================================
// 推荐算法实验分析脚本
// scripts/analyze-recommendation.ts
//
// 用法：npx tsx scripts/analyze-recommendation.ts
// 功能：运行推荐算法，对比各基线算法，输出可用于论文的实验数据
// ============================================

import { PrismaClient } from "@prisma/client";
import {
  getRecommendations,
  getTimeBasedRecommendations,
  getPureCFRecommendations,
  getPureContentRecommendations,
} from "@/lib/recommendation";

const prisma = new PrismaClient();

// ==================== 评估指标 ====================

/**
 * 准确率 (Precision@K)
 * 推荐列表中，与用户兴趣匹配的帖子占比
 */
function precisionAtK(
  recommendedPostIds: string[],
  relevantPostIds: Set<string>,
  k: number
): number {
  const topK = recommendedPostIds.slice(0, k);
  const hits = topK.filter((id) => relevantPostIds.has(id)).length;
  return hits / k;
}

/**
 * 召回率 (Recall@K)
 * 用户感兴趣的帖子中，有多少被推荐到了
 */
function recallAtK(
  recommendedPostIds: string[],
  relevantPostIds: Set<string>,
  k: number
): number {
  if (relevantPostIds.size === 0) return 0;
  const topK = recommendedPostIds.slice(0, k);
  const hits = topK.filter((id) => relevantPostIds.has(id)).length;
  return hits / relevantPostIds.size;
}

/**
 * 标签覆盖率 (Tag Coverage)
 * 推荐列表覆盖了多少不同的标签（多样性指标）
 */
function tagCoverage(
  recommendedPosts: Array<{ tags: string[] }>,
  allTags: Set<string>
): number {
  const coveredTags = new Set<string>();
  for (const post of recommendedPosts) {
    for (const tag of post.tags) {
      coveredTags.add(tag);
    }
  }
  return coveredTags.size / allTags.size;
}

/**
 * 难度匹配率 (Difficulty Match Rate)
 * 推荐帖子难度与用户技能等级差距在±1以内的比例
 */
function difficultyMatchRate(
  recommendedPosts: Array<{ difficulty: number }>,
  userSkillLevel: number
): number {
  if (recommendedPosts.length === 0) return 0;
  const matched = recommendedPosts.filter(
    (p) => Math.abs(p.difficulty - userSkillLevel) <= 1
  ).length;
  return matched / recommendedPosts.length;
}

// ==================== 主分析函数 ====================

async function runExperiment() {
  console.log("🔬 开始推荐算法对比实验\n");
  console.log("=".repeat(60));

  // 获取测试用户（按技能等级均匀采样）
  const testUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      skillLevel: true,
      interests: true,
      likes: { select: { postId: true } },
      bookmarks: { select: { postId: true } },
    },
    take: 30, // 取30个用户做实验
  });

  // 获取所有标签集合
  const allPosts = await prisma.post.findMany({
    select: { id: true, tags: true, difficulty: true },
  });
  const allTags = new Set(allPosts.flatMap((p) => p.tags));

  const K_VALUES = [5, 10, 20]; // 评估不同 TopK

  // 四种算法的实验结果
  const results = {
    multiFactor: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
    timeBased: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
    pureCF: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
    pureContent: { precision: [] as number[], recall: [] as number[], diffMatch: [] as number[], coverage: [] as number[] },
  };

  for (const user of testUsers) {
    // 该用户的"相关"帖子 = 与兴趣标签匹配的帖子
    const relevantPostIds = new Set(
      allPosts
        .filter((p) => p.tags.some((t) => user.interests.includes(t)))
        .map((p) => p.id)
    );

    const K = 10; // 主要评估 Top10

    // 1. 多因子融合算法（本文提出）
    try {
      const mfResult = await getRecommendations(user.id, K, true);
      const mfPostIds = mfResult.recommendations.map((r) => r.postId);
      const mfPosts = allPosts.filter((p) => mfPostIds.includes(p.id));

      results.multiFactor.precision.push(precisionAtK(mfPostIds, relevantPostIds, K));
      results.multiFactor.recall.push(recallAtK(mfPostIds, relevantPostIds, K));
      results.multiFactor.diffMatch.push(difficultyMatchRate(mfPosts, user.skillLevel));
      results.multiFactor.coverage.push(tagCoverage(mfPosts, allTags));
    } catch (e) {
      console.error(`  用户 ${user.username} 多因子算法失败:`, e);
    }

    // 2. 时间排序（基线1）
    try {
      const timePostIds = await getTimeBasedRecommendations(user.id, K);
      const timePosts = allPosts.filter((p) => timePostIds.includes(p.id));

      results.timeBased.precision.push(precisionAtK(timePostIds, relevantPostIds, K));
      results.timeBased.recall.push(recallAtK(timePostIds, relevantPostIds, K));
      results.timeBased.diffMatch.push(difficultyMatchRate(timePosts, user.skillLevel));
      results.timeBased.coverage.push(tagCoverage(timePosts, allTags));
    } catch (e) {
      console.error(`  用户 ${user.username} 时间排序失败:`, e);
    }

    // 3. 纯协同过滤（基线2）
    try {
      const cfPostIds = await getPureCFRecommendations(user.id, K);
      const cfPosts = allPosts.filter((p) => cfPostIds.includes(p.id));

      results.pureCF.precision.push(precisionAtK(cfPostIds, relevantPostIds, K));
      results.pureCF.recall.push(recallAtK(cfPostIds, relevantPostIds, K));
      results.pureCF.diffMatch.push(difficultyMatchRate(cfPosts, user.skillLevel));
      results.pureCF.coverage.push(tagCoverage(cfPosts, allTags));
    } catch (e) {
      console.error(`  用户 ${user.username} 协同过滤失败:`, e);
    }

    // 4. 纯内容推荐（基线3）
    try {
      const contentPostIds = await getPureContentRecommendations(user.id, K);
      const contentPosts = allPosts.filter((p) => contentPostIds.includes(p.id));

      results.pureContent.precision.push(precisionAtK(contentPostIds, relevantPostIds, K));
      results.pureContent.recall.push(recallAtK(contentPostIds, relevantPostIds, K));
      results.pureContent.diffMatch.push(difficultyMatchRate(contentPosts, user.skillLevel));
      results.pureContent.coverage.push(tagCoverage(contentPosts, allTags));
    } catch (e) {
      console.error(`  用户 ${user.username} 内容推荐失败:`, e);
    }

    process.stdout.write(".");
  }

  console.log("\n");

  // ===== 输出实验结果表格 =====
  const avg = (arr: number[]) =>
    arr.length > 0
      ? (arr.reduce((a, b) => a + b, 0) / arr.length * 100).toFixed(2) + "%"
      : "N/A";

  console.log("=".repeat(60));
  console.log("📊 实验结果（可直接用于论文表格）");
  console.log("=".repeat(60));
  console.log(`评估指标 @ Top10 (${testUsers.length} 个测试用户的平均值)\n`);

  console.log(
    "算法名称".padEnd(20) +
    "Precision".padEnd(14) +
    "Recall".padEnd(14) +
    "难度匹配率".padEnd(14) +
    "标签覆盖率".padEnd(14)
  );
  console.log("-".repeat(72));

  const algorithms = [
    { name: "时间排序（基线）", data: results.timeBased },
    { name: "协同过滤（基线）", data: results.pureCF },
    { name: "内容推荐（基线）", data: results.pureContent },
    { name: "本文算法 ★", data: results.multiFactor },
  ];

  for (const algo of algorithms) {
    console.log(
      algo.name.padEnd(20) +
      avg(algo.data.precision).padEnd(14) +
      avg(algo.data.recall).padEnd(14) +
      avg(algo.data.diffMatch).padEnd(14) +
      avg(algo.data.coverage).padEnd(14)
    );
  }

  console.log("-".repeat(72));

  // ===== 输出各因子得分分布（用于论文雷达图）=====
  console.log("\n📊 本文算法各因子平均得分分布（用于雷达图）");
  console.log("=".repeat(40));

  // 取一个样本用户详细分析
  const sampleUser = testUsers[0];
  const sampleResult = await getRecommendations(sampleUser.id, 20, true);

  const avgDetails = {
    cfScore: 0,
    simScore: 0,
    skillScore: 0,
    qualityScore: 0,
  };

  for (const rec of sampleResult.recommendations) {
    if (rec.details) {
      avgDetails.cfScore += rec.details.cfScore;
      avgDetails.simScore += rec.details.simScore;
      avgDetails.skillScore += rec.details.skillScore;
      avgDetails.qualityScore += rec.details.qualityScore;
    }
  }

  const count = sampleResult.recommendations.length;
  console.log(`样本用户: ${sampleUser.displayName} (Lv${sampleUser.skillLevel})`);
  console.log(`兴趣标签: ${sampleUser.interests.join(", ")}`);
  console.log(`推荐帖子数: ${count}`);
  console.log(`协同过滤均分: ${(avgDetails.cfScore / count).toFixed(4)}`);
  console.log(`内容相似均分: ${(avgDetails.simScore / count).toFixed(4)}`);
  console.log(`技能匹配均分: ${(avgDetails.skillScore / count).toFixed(4)}`);
  console.log(`质量评估均分: ${(avgDetails.qualityScore / count).toFixed(4)}`);
  console.log(`计算耗时: ${sampleResult.meta.computeTimeMs}ms`);

  console.log("\n🎉 实验完成！以上数据可直接用于论文的实验分析章节。");
}

runExperiment()
  .catch((e) => {
    console.error("❌ 实验失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });