// scripts/update-skill-levels.ts
// 用法：npx tsx scripts/update-skill-levels.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function calculateLevel(userId: string): Promise<number> {
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

async function main() {
  console.log("🔄 开始更新所有用户技能等级...\n");

  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, skillLevel: true },
  });

  let changed = 0;

  for (const user of users) {
    const newLevel = await calculateLevel(user.id);

    if (newLevel !== user.skillLevel) {
      await prisma.user.update({
        where: { id: user.id },
        data: { skillLevel: newLevel },
      });
      console.log(
        `  ${user.displayName}(@${user.username}): Lv${user.skillLevel} → Lv${newLevel}`
      );
      changed++;
    }
  }

  console.log(`\n✅ 完成！共更新 ${changed}/${users.length} 个用户的等级`);
}

main()
  .catch((e) => {
    console.error("❌ 失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());