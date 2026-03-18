// scripts/seed-lurkers.ts
// 用法：npx tsx scripts/seed-lurkers.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return "c" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

function randomDate(daysBack: number = 90): Date {
  const now = new Date();
  const past = new Date(now.getTime() - randomInt(0, daysBack) * 24 * 60 * 60 * 1000);
  past.setHours(randomInt(8, 23), randomInt(0, 59), randomInt(0, 59));
  return past;
}

const SURNAMES = [
  "张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴",
  "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
];

const GIVEN_NAMES = [
  "子豪", "雨萱", "浩宇", "欣怡", "博文", "嘉琪", "天佑", "诗雨",
  "俊熙", "梦琪", "宇航", "雅涵", "泽宇", "思琪", "文博", "语嫣",
  "明轩", "雨欣", "志远", "若曦", "鹏飞", "婉婷", "翔宇", "雨彤",
  "星辰", "悦琳", "景行", "雨薇", "瑞霖", "诗颖", "逸飞", "雅琪",
  "皓轩", "欣悦", "宸宇", "梦瑶", "致远", "语桐", "骏杰", "雨晴",
];

const ALL_TAGS = [
  "JavaScript", "TypeScript", "React", "Vue", "Next.js", "CSS", "HTML", "Tailwind",
  "Java", "Spring Boot", "Node.js", "Express", "Python", "Django", "Go", "Rust",
  "MySQL", "PostgreSQL", "MongoDB", "Redis", "Prisma",
  "Docker", "Linux", "Git", "CI/CD", "Nginx",
  "算法", "数据结构", "设计模式", "系统设计",
];

const COMMENT_TEMPLATES = [
  "写得很好，学到了！",
  "感谢分享，收藏了",
  "正好在学这个，很有帮助",
  "代码很清晰，赞一个",
  "请问有后续吗？期待更新",
  "踩过同样的坑，感同身受",
  "新手表示看懂了，谢谢楼主",
  "这个方法我之前不知道，涨知识了",
  "面试刚好用上了，感谢！",
  "楼主太强了，膜拜",
  "简单实用，已收藏",
  "终于有人把这个讲清楚了",
  "跟着敲了一遍，加深了理解",
  "请问这个兼容性怎么样？",
  "好文好文，关注了",
];

async function main() {
  console.log("🌱 开始生成 40 个潜水用户...\n");

  // 获取所有现有帖子（用于点赞和评论）
  const allPosts = await prisma.post.findMany({
    select: { id: true },
  });

  if (allPosts.length === 0) {
    console.error("❌ 数据库中没有帖子，请先运行 seed-recommendation.ts");
    return;
  }

  const usedUsernames = new Set<string>();

  // 生成40个潜水用户，分成4组
  const groups = [
    { name: "只点赞", count: 10, likes: true, comments: false },
    { name: "只评论", count: 10, likes: false, comments: true },
    { name: "点赞+评论", count: 10, likes: true, comments: true },
    { name: "纯潜水", count: 10, likes: false, comments: false },
  ];

  let totalLikes = 0;
  let totalComments = 0;

  for (const group of groups) {
    console.log(`📝 生成「${group.name}」组 ${group.count} 人...`);

    for (let i = 0; i < group.count; i++) {
      // 生成唯一用户名
      let username: string;
      do {
        username = `lurker_${randomInt(10000, 99999)}`;
      } while (usedUsernames.has(username));
      usedUsernames.add(username);

      const surname = randomItem(SURNAMES);
      const givenName = randomItem(GIVEN_NAMES);
      const interests = [
        ALL_TAGS[randomInt(0, ALL_TAGS.length - 1)],
        ALL_TAGS[randomInt(0, ALL_TAGS.length - 1)],
      ].filter((v, i, a) => a.indexOf(v) === i); // 去重

      const userId = generateId();

      // 创建用户
      await prisma.user.create({
        data: {
          id: userId,
          username,
          displayName: `${surname}${givenName}`,
          email: `${username}@example.com`,
          passwordHash: "$2a$10$fakehashforlurker" + i.toString().padStart(4, "0"),
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          bio: "低调潜水中...",
          skillLevel: 1,
          interests,
          createAt: randomDate(180),
        },
      });

      // 点赞行为
      if (group.likes) {
        const likeCount = randomInt(3, 15);
        const likedPostIds = new Set<string>();

        for (let j = 0; j < likeCount; j++) {
          const post = randomItem(allPosts);
          if (likedPostIds.has(post.id)) continue;
          likedPostIds.add(post.id);

          try {
            await prisma.like.create({
              data: { userId, postId: post.id },
            });
            totalLikes++;
          } catch {
            // 跳过重复
          }
        }
      }

      // 评论行为
      if (group.comments) {
        const commentCount = randomInt(2, 8);

        for (let j = 0; j < commentCount; j++) {
          const post = randomItem(allPosts);
          const content = randomItem(COMMENT_TEMPLATES);

          await prisma.comment.create({
            data: {
              content,
              userId,
              postId: post.id,
              createAt: randomDate(60),
            },
          });
          totalComments++;
        }
      }
    }

    console.log(`  ✅ 「${group.name}」组完成`);
  }

  // 更新这些用户的技能等级
  console.log("\n🔄 更新潜水用户技能等级...");
  const lurkers = await prisma.user.findMany({
    where: { email: { contains: "lurker_" } },
    select: { id: true },
  });

  for (const lurker of lurkers) {
    const postStats = await prisma.post.aggregate({
      where: { userId: lurker.id },
      _count: true,
      _sum: { codeBlocks: true },
    });
    const likeCount = await prisma.like.count({
      where: { post: { userId: lurker.id } },
    });
    const bookmarkCount = await prisma.bookmark.count({
      where: { post: { userId: lurker.id } },
    });
    const commentCount = await prisma.comment.count({
      where: { userId: lurker.id },
    });

    const rawScore =
      (postStats._count || 0) * 2 +
      (postStats._sum.codeBlocks || 0) * 3 +
      likeCount * 1 +
      bookmarkCount * 2 +
      commentCount * 1;

    let level = 1;
    if (rawScore > 100) level = 5;
    else if (rawScore > 60) level = 4;
    else if (rawScore > 30) level = 3;
    else if (rawScore > 10) level = 2;

    await prisma.user.update({
      where: { id: lurker.id },
      data: { skillLevel: level },
    });
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 潜水用户生成完成！");
  console.log(`   👤 用户: 40 (4组 × 10人)`);
  console.log(`   ❤️  点赞: ${totalLikes}`);
  console.log(`   💬 评论: ${totalComments}`);
  console.log(`   📄 发帖: 0 (全员潜水)`);
  console.log("=".repeat(50));
  console.log("\n分组说明：");
  console.log("  只点赞组(10人): 随机点赞3-15篇，不评论不发帖");
  console.log("  只评论组(10人): 随机评论2-8条，不点赞不发帖");
  console.log("  点赞+评论组(10人): 既点赞又评论");
  console.log("  纯潜水组(10人): 什么都不做，仅注册");
}

main()
  .catch((e) => {
    console.error("❌ 失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());