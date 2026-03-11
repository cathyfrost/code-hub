import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

// 用户清单
const users = [
  { username: "ethan_reeves", email: "ethan.reeves92@gmail.com" },
  { username: "claire_morton", email: "c.morton_dev@outlook.com" },
  { username: "jacob_wu", email: "jacobwu2001@gmail.com" },
  { username: "sophie_lane", email: "sophielane@hotmail.com" },
  { username: "marcus_bell", email: "marcus.bell@yahoo.com" },
  { username: "lily_chen", email: "lilych3n@gmail.com" },
  { username: "ryan_oconnor", email: "ryan.oconnor@icloud.com" },
  { username: "nora_jensen", email: "nora.jensen88@proton.me" },
  { username: "alex_hartley", email: "alexhartley_main@gmail.com" },
  { username: "zoe_walker", email: "zoewalker.contact@outlook.com" },
];

// 默认密码，插入后可以让用户自行修改
const DEFAULT_PASSWORD = "CodeHub@2024";

async function main() {
  console.log("开始插入用户...\n");

  for (const user of users) {
    // 生成 Argon2 哈希（参数和你项目里保持一致）
    const passwordHash = await hash(DEFAULT_PASSWORD, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    try {
      const created = await prisma.user.create({
        data: {
          id: createId(),
          username: user.username,
          displayName: user.username,
          email: user.email,
          passwordHash,
        },
      });
      console.log(`✅ ${created.username} (${created.id})`);
    } catch (error: any) {
      // 如果用户已存在会报唯一约束错误，跳过即可
      if (error.code === "P2002") {
        console.log(`⏭️  ${user.username} 已存在，跳过`);
      } else {
        console.error(`❌ ${user.username} 插入失败:`, error.message);
      }
    }
  }

  console.log("\n全部完成！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
