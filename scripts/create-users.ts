// ============================================
// CodeHub 模拟用户重建脚本
// scripts/create-users.ts
//
// 用法：npx tsx scripts/create-users.ts
// 功能：重新创建 80 个活跃用户 + 40 个潜水用户 + 关注关系
// ============================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}
function generateId(): string {
  return "c" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}
function randomDate(daysBack: number = 180): Date {
  const now = new Date();
  const past = new Date(now.getTime() - randomInt(0, daysBack) * 24 * 60 * 60 * 1000);
  past.setHours(randomInt(8, 23), randomInt(0, 59), randomInt(0, 59));
  return past;
}

// ==================== 基础数据 ====================
const SURNAMES = [
  "张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴",
  "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
  "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
];

const GIVEN_NAMES = [
  "伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "洋", "勇",
  "艳", "杰", "涛", "明", "超", "秀英", "华", "慧", "建华", "玲",
  "桂英", "飞", "平", "鑫", "军", "辉", "志强", "秀兰", "霞", "旭",
  "宇轩", "子涵", "浩然", "梓萱", "雨桐", "思远", "晨曦", "诗涵", "昊天", "若溪",
  "子豪", "雨萱", "浩宇", "欣怡", "博文", "嘉琪", "天佑", "诗雨",
  "俊熙", "梦琪", "宇航", "雅涵", "泽宇", "思琪", "文博", "语嫣",
  "明轩", "雨欣", "志远", "若曦", "鹏飞", "婉婷", "翔宇", "雨彤",
];

const TAGS = {
  frontend: ["JavaScript", "TypeScript", "React", "Vue", "Next.js", "CSS", "HTML", "Tailwind"],
  backend: ["Java", "Spring Boot", "Node.js", "Express", "Python", "Django", "Go", "Rust"],
  database: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "Prisma"],
  devops: ["Docker", "Linux", "Git", "CI/CD", "Nginx"],
  mobile: ["Flutter", "React Native", "Swift", "Kotlin"],
  ai: ["机器学习", "深度学习", "PyTorch", "TensorFlow", "NLP"],
  general: ["算法", "数据结构", "设计模式", "系统设计"],
};

const ALL_TAGS = Object.values(TAGS).flat();

const USER_PROFILES = [
  { direction: "前端开发", tags: TAGS.frontend, weight: 0.25 },
  { direction: "后端开发", tags: TAGS.backend, weight: 0.25 },
  { direction: "全栈开发", tags: [...TAGS.frontend, ...TAGS.backend], weight: 0.2 },
  { direction: "AI/数据", tags: TAGS.ai, weight: 0.1 },
  { direction: "移动开发", tags: TAGS.mobile, weight: 0.1 },
  { direction: "DevOps", tags: TAGS.devops, weight: 0.1 },
];

const ACTIVE_BIOS = [
  "{direction}方向 | 热爱编程，热爱分享",
  "{direction}开发者 | 每天进步一点点",
  "专注{direction} | 开源爱好者",
  "{direction} | 在学习的路上",
  "做{direction}的 | 欢迎交流",
  "{direction}工程师 | 记录成长",
];

const LURKER_BIOS = [
  "低调潜水中...",
  "喜欢看大家分享",
  "默默学习的小透明",
  "先看看再说",
  "潜水员一枚",
  "学习中，暂时不发帖",
  "安静的学习者",
  "收藏夹吃灰选手",
];

function randomProfile(): (typeof USER_PROFILES)[number] {
  const rand = Math.random();
  let cumulative = 0;
  for (const profile of USER_PROFILES) {
    cumulative += profile.weight;
    if (rand < cumulative) return profile;
  }
  return USER_PROFILES[0];
}

// ==================== 主逻辑 ====================
async function main() {
  console.log("🌱 开始创建模拟用户...\n");

  const usedUsernames = new Set<string>();

  // 检查是否已存在模拟用户
  const existingCount = await prisma.user.count({
    where: { email: { endsWith: "@example.com" } },
  });
  if (existingCount > 0) {
    console.log(`⚠️  已存在 ${existingCount} 个模拟用户，跳过创建。`);
    console.log("   如需重建，请先用 cleanup.ts 删除模拟用户。\n");
    return;
  }

  // ===== 1. 创建 80 个活跃用户 =====
  console.log("📝 创建 80 个活跃用户...");

  interface UserRecord {
    id: string;
    interests: string[];
  }

  const activeUsers: UserRecord[] = [];

  for (let i = 0; i < 80; i++) {
    const profile = randomProfile();
    const skillLevel = randomInt(1, 5);

    let username: string;
    do {
      username = `coder_${randomInt(10000, 99999)}`;
    } while (usedUsernames.has(username));
    usedUsernames.add(username);

    const surname = randomItem(SURNAMES);
    const givenName = randomItem(GIVEN_NAMES);

    const interestCount = randomInt(2, 5);
    const directionTags = randomItems(profile.tags, Math.ceil(interestCount * 0.7));
    const randomTags = randomItems(ALL_TAGS, Math.floor(interestCount * 0.3));
    const interests = [...new Set([...directionTags, ...randomTags])];

    const bioTemplate = randomItem(ACTIVE_BIOS);
    const bio = bioTemplate.replace(/\{direction\}/g, profile.direction);

    const userId = generateId();

    await prisma.user.create({
      data: {
        id: userId,
        username,
        displayName: `${surname}${givenName}`,
        email: `${username}@example.com`,
        passwordHash: "$2a$10$fakehashforseeding" + i.toString().padStart(4, "0"),
        avatarUrl: null,
        bio,
        skillLevel,
        interests,
        createAt: randomDate(180),
      },
    });

    activeUsers.push({ id: userId, interests });
  }
  console.log(`  ✅ 80 个活跃用户已创建`);

  // ===== 2. 创建 40 个潜水用户 =====
  console.log("\n📝 创建 40 个潜水用户...");

  const lurkerUsers: UserRecord[] = [];

  for (let i = 0; i < 40; i++) {
    let username: string;
    do {
      username = `lurker_${randomInt(10000, 99999)}`;
    } while (usedUsernames.has(username));
    usedUsernames.add(username);

    const surname = randomItem(SURNAMES);
    const givenName = randomItem(GIVEN_NAMES);

    const interests = randomItems(ALL_TAGS, randomInt(1, 3));

    const userId = generateId();

    await prisma.user.create({
      data: {
        id: userId,
        username,
        displayName: `${surname}${givenName}`,
        email: `${username}@example.com`,
        passwordHash: "$2a$10$fakehashforlurker" + i.toString().padStart(4, "0"),
        avatarUrl: null,
        bio: randomItem(LURKER_BIOS),
        skillLevel: 1,
        interests,
        createAt: randomDate(180),
      },
    });

    lurkerUsers.push({ id: userId, interests });
  }
  console.log(`  ✅ 40 个潜水用户已创建`);

  // ===== 3. 生成关注关系 =====
  console.log("\n📝 生成关注关系...");

  const allSimUsers = [...activeUsers, ...lurkerUsers];
  let followCount = 0;
  const followSet = new Set<string>();

  // 活跃用户之间互相关注
  for (const user of activeUsers) {
    const numFollows = randomInt(3, 20);
    const sameInterestUsers = allSimUsers.filter(
      (u) => u.id !== user.id && u.interests.some((t) => user.interests.includes(t))
    );

    for (let j = 0; j < numFollows; j++) {
      const target =
        Math.random() < 0.6 && sameInterestUsers.length > 0
          ? randomItem(sameInterestUsers)
          : randomItem(allSimUsers);

      if (target.id === user.id) continue;
      const key = `${user.id}-${target.id}`;
      if (followSet.has(key)) continue;
      followSet.add(key);

      await prisma.follow.create({
        data: { followerId: user.id, followingId: target.id },
      });
      followCount++;
    }
  }

  // 潜水用户关注一些活跃用户（但不被关注）
  for (const lurker of lurkerUsers) {
    const numFollows = randomInt(1, 8);
    for (let j = 0; j < numFollows; j++) {
      const target = randomItem(activeUsers);
      const key = `${lurker.id}-${target.id}`;
      if (followSet.has(key)) continue;
      followSet.add(key);

      await prisma.follow.create({
        data: { followerId: lurker.id, followingId: target.id },
      });
      followCount++;
    }
  }

  console.log(`  ✅ ${followCount} 条关注关系已创建`);

  // ===== 统计 =====
  console.log("\n" + "=".repeat(50));
  console.log("🎉 模拟用户创建完成！");
  console.log(`   👤 活跃用户: 80`);
  console.log(`   🫥 潜水用户: 40`);
  console.log(`   👥 关注关系: ${followCount}`);
  console.log("=".repeat(50));
  console.log("\n接下来可以运行 seed 脚本生成帖子：");
  console.log("  npx tsx prisma/seed-recommendation.ts");
}

main()
  .catch((e) => {
    console.error("❌ 失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());