import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import { hashSync } from "@node-rs/argon2";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function createAdmin() {
  console.log("\n── 创建新管理员账号 ──\n");

  const username = await ask("用户名: ");
  if (!username) {
    console.log("用户名不能为空");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`用户名 "${username}" 已存在`);
    return;
  }

  const displayName = await ask("显示名称: ");
  const email = await ask("邮箱 (可选，直接回车跳过): ");
  const password = await ask("密码: ");

  if (!password || password.length < 8) {
    console.log("密码不能少于8位");
    return;
  }

  const passwordHash = hashSync(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      id: generateId(),
      username,
      displayName: displayName || username,
      email: email || null,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`\n✅ 管理员创建成功！`);
  console.log(`   用户名: ${user.username}`);
  console.log(`   显示名称: ${user.displayName}`);
  console.log(`   角色: ADMIN\n`);
}

async function promoteUser() {
  console.log("\n── 将现有用户设为管理员 ──\n");

  const keyword = await ask("输入用户名或邮箱: ");
  if (!keyword) {
    console.log("输入不能为空");
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: keyword },
        { email: keyword },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    console.log(`未找到用户 "${keyword}"`);
    return;
  }

  if (user.role === "ADMIN") {
    console.log(`${user.displayName} (@${user.username}) 已经是管理员了`);
    return;
  }

  console.log(`\n找到用户:`);
  console.log(`  显示名称: ${user.displayName}`);
  console.log(`  用户名: @${user.username}`);
  console.log(`  邮箱: ${user.email || "无"}`);
  console.log(`  当前角色: ${user.role}\n`);

  const confirm = await ask("确认设为管理员？(y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("已取消");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  console.log(`\n✅ ${user.displayName} (@${user.username}) 已设为管理员\n`);
}

async function demoteUser() {
  console.log("\n── 将管理员降为普通用户 ──\n");

  const keyword = await ask("输入用户名或邮箱: ");
  if (!keyword) {
    console.log("输入不能为空");
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: keyword },
        { email: keyword },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    console.log(`未找到用户 "${keyword}"`);
    return;
  }

  if (user.role === "USER") {
    console.log(`${user.displayName} (@${user.username}) 已经是普通用户了`);
    return;
  }

  console.log(`\n找到管理员:`);
  console.log(`  显示名称: ${user.displayName}`);
  console.log(`  用户名: @${user.username}`);
  console.log(`  邮箱: ${user.email || "无"}\n`);

  const confirm = await ask("确认降为普通用户？(y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("已取消");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "USER" },
  });

  console.log(`\n✅ ${user.displayName} (@${user.username}) 已降为普通用户\n`);
}

async function main() {
  console.log("\n================================");
  console.log("   CodeHub 管理员设置工具");
  console.log("================================\n");
  console.log("  1. 创建新管理员账号");
  console.log("  2. 将现有用户设为管理员");
  console.log("  3. 将管理员降为普通用户");
  console.log("  0. 退出\n");

  const choice = await ask("请选择 (0/1/2/3): ");

  switch (choice) {
    case "1":
      await createAdmin();
      break;
    case "2":
      await promoteUser();
      break;
    case "3":
      await demoteUser();
      break;
    case "0":
      console.log("再见\n");
      break;
    default:
      console.log("无效选择");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });