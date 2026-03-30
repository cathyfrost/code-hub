// prisma/seed-contest.ts
// 用法：npx tsx prisma/seed-contest.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. 查找现有题目，按难度排序取 4 道
  const quizzes = await prisma.quiz.findMany({
    orderBy: { order: "asc" },
    take: 20,
  });

  if (quizzes.length < 4) {
    console.error(
      `❌ 题库中只有 ${quizzes.length} 道题，至少需要 4 道才能创建周赛`,
    );
    process.exit(1);
  }

  // 按难度分组
  const easy = quizzes.filter((q) => q.difficulty === "easy");
  const medium = quizzes.filter((q) => q.difficulty === "medium");
  const hard = quizzes.filter((q) => q.difficulty === "hard");

  // 选题：2 简单 + 1 中等 + 1 困难（不够则降级）
  const selected: typeof quizzes = [];

  // 第 1 题：简单
  if (easy.length >= 1) selected.push(easy[0]);
  else selected.push(quizzes[0]);

  // 第 2 题：简单或中等
  if (easy.length >= 2) selected.push(easy[1]);
  else if (medium.length >= 1) selected.push(medium[0]);
  else selected.push(quizzes[1]);

  // 第 3 题：中等
  if (medium.length >= 1 && !selected.includes(medium[0]))
    selected.push(medium[0]);
  else if (medium.length >= 2) selected.push(medium[1]);
  else selected.push(quizzes[Math.min(2, quizzes.length - 1)]);

  // 第 4 题：困难
  if (hard.length >= 1) selected.push(hard[0]);
  else selected.push(quizzes[Math.min(3, quizzes.length - 1)]);

  // 去重
  const uniqueSelected: typeof quizzes = [];
  const usedIds = new Set<string>();
  for (const q of selected) {
    if (!usedIds.has(q.id)) {
      uniqueSelected.push(q);
      usedIds.add(q.id);
    }
  }
  // 如果去重后不够 4 道，从剩余题目补充
  for (const q of quizzes) {
    if (uniqueSelected.length >= 4) break;
    if (!usedIds.has(q.id)) {
      uniqueSelected.push(q);
      usedIds.add(q.id);
    }
  }

  const problemCount = Math.min(uniqueSelected.length, 4);
  const scores = [3, 4, 6, 6]; // 力扣风格分值

  // 2. 计算比赛时间（下周日 10:30 开始，持续 1.5 小时）
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=周日
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 30, 0, 0);

  const endTime = new Date(nextSunday.getTime() + 90 * 60 * 1000); // +1.5h

  // 3. 查询已有周赛数量，算出赛次编号
  const contestCount = await prisma.contest.count();
  const contestNumber = contestCount + 1;

  // 4. 创建周赛
  const contest = await prisma.contest.create({
    data: {
      title: `第 ${contestNumber} 场周赛`,
      description: `CodeHub 第 ${contestNumber} 场周赛，共 ${problemCount} 道题，限时 90 分钟。`,
      startTime: nextSunday,
      endTime: endTime,
      status: "UPCOMING",
      problems: {
        create: uniqueSelected.slice(0, problemCount).map((quiz, i) => ({
          quizId: quiz.id,
          order: i + 1,
          score: scores[i] || 4,
        })),
      },
    },
    include: {
      problems: {
        include: { quiz: { select: { title: true, difficulty: true } } },
      },
    },
  });

  console.log("\n✅ 周赛创建成功！\n");
  console.log(`   标题：${contest.title}`);
  console.log(`   开始：${contest.startTime.toLocaleString("zh-CN")}`);
  console.log(`   结束：${contest.endTime.toLocaleString("zh-CN")}`);
  console.log(`   状态：${contest.status}`);
  console.log(`\n   题目列表：`);
  contest.problems.forEach((p) => {
    const diffLabel =
      p.quiz.difficulty === "easy"
        ? "简单"
        : p.quiz.difficulty === "medium"
          ? "中等"
          : "困难";
    console.log(
      `   ${p.order}. [${diffLabel}] ${p.quiz.title}  (${p.score} 分)`,
    );
  });
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ 创建失败：", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());