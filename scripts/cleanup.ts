// ============================================
// CodeHub 数据清理工具
// scripts/cleanup.ts
//
// 用法：npx tsx scripts/cleanup.ts
// 功能：交互式选择清除数据类型
// ============================================

import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function deleteAllPosts() {
  console.log("\n🗑️  正在删除所有帖子相关数据...");
  const notifications = await prisma.notification.deleteMany({});
  console.log(`  删除通知: ${notifications.count}`);
  const commentLikes = await prisma.commentLike.deleteMany({});
  console.log(`  删除评论点赞: ${commentLikes.count}`);
  const comments = await prisma.comment.deleteMany({});
  console.log(`  删除评论: ${comments.count}`);
  const likes = await prisma.like.deleteMany({});
  console.log(`  删除点赞: ${likes.count}`);
  const bookmarks = await prisma.bookmark.deleteMany({});
  console.log(`  删除收藏: ${bookmarks.count}`);
  const media = await prisma.media.deleteMany({});
  console.log(`  删除媒体: ${media.count}`);
  const posts = await prisma.post.deleteMany({});
  console.log(`  删除帖子: ${posts.count}`);
  console.log("  ✅ 所有帖子相关数据已清除");
}

async function deleteAllComments() {
  console.log("\n🗑️  正在删除所有评论...");
  const commentLikes = await prisma.commentLike.deleteMany({});
  console.log(`  删除评论点赞: ${commentLikes.count}`);
  const comments = await prisma.comment.deleteMany({});
  console.log(`  删除评论: ${comments.count}`);
  console.log("  ✅ 所有评论已清除");
}

async function deleteAllUsers() {
  console.log("\n🗑️  正在删除所有用户（会级联删除所有数据）...");
  const notifications = await prisma.notification.deleteMany({});
  console.log(`  删除通知: ${notifications.count}`);
  const commentLikes = await prisma.commentLike.deleteMany({});
  console.log(`  删除评论点赞: ${commentLikes.count}`);
  const comments = await prisma.comment.deleteMany({});
  console.log(`  删除评论: ${comments.count}`);
  const likes = await prisma.like.deleteMany({});
  console.log(`  删除点赞: ${likes.count}`);
  const bookmarks = await prisma.bookmark.deleteMany({});
  console.log(`  删除收藏: ${bookmarks.count}`);
  const media = await prisma.media.deleteMany({});
  console.log(`  删除媒体: ${media.count}`);
  const posts = await prisma.post.deleteMany({});
  console.log(`  删除帖子: ${posts.count}`);
  const quizSubmissions = await prisma.quizSubmission.deleteMany({});
  console.log(`  删除题目提交: ${quizSubmissions.count}`);
  const aiMessages = await prisma.aiMessage.deleteMany({});
  console.log(`  删除AI消息: ${aiMessages.count}`);
  const aiConversations = await prisma.aiConversation.deleteMany({});
  console.log(`  删除AI对话: ${aiConversations.count}`);
  const notebooks = await prisma.notebook.deleteMany({});
  console.log(`  删除笔记: ${notebooks.count}`);
  const notebookFolders = await prisma.notebookFolder.deleteMany({});
  console.log(`  删除笔记文件夹: ${notebookFolders.count}`);
  const follows = await prisma.follow.deleteMany({});
  console.log(`  删除关注关系: ${follows.count}`);
  const sessions = await prisma.session.deleteMany({});
  console.log(`  删除会话: ${sessions.count}`);
  const users = await prisma.user.deleteMany({});
  console.log(`  删除用户: ${users.count}`);
  console.log("  ✅ 所有用户和相关数据已清除");
}

async function deleteSeedUsers() {
  console.log("\n🗑️  正在删除模拟用户（保留你的真实账号）...");
  // 模拟用户的邮箱包含 @example.com
  await prisma.commentLike.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.comment.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.like.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.bookmark.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.notification.deleteMany({ where: { issuer: { email: { endsWith: "@example.com" } } } });
  await prisma.media.deleteMany({ where: { post: { user: { email: { endsWith: "@example.com" } } } } });
  await prisma.post.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  await prisma.follow.deleteMany({ where: { follower: { email: { endsWith: "@example.com" } } } });
  await prisma.follow.deleteMany({ where: { following: { email: { endsWith: "@example.com" } } } });
  await prisma.session.deleteMany({ where: { user: { email: { endsWith: "@example.com" } } } });
  const result = await prisma.user.deleteMany({ where: { email: { endsWith: "@example.com" } } });
  console.log(`  删除模拟用户: ${result.count}`);
  console.log("  ✅ 所有模拟用户和他们的数据已清除，你的账号保留");
}

async function deleteAIChats() {
  console.log("\n🗑️  正在删除所有 AI 聊天记录...");
  const messages = await prisma.aiMessage.deleteMany({});
  console.log(`  删除AI消息: ${messages.count}`);
  const conversations = await prisma.aiConversation.deleteMany({});
  console.log(`  删除AI对话: ${conversations.count}`);
  console.log("  ✅ 所有 AI 聊天记录已清除");
}

async function showStats() {
  const users = await prisma.user.count();
  const seedUsers = await prisma.user.count({ where: { email: { endsWith: "@example.com" } } });
  const posts = await prisma.post.count();
  const comments = await prisma.comment.count();
  const likes = await prisma.like.count();
  const bookmarks = await prisma.bookmark.count();
  const follows = await prisma.follow.count();
  const aiConversations = await prisma.aiConversation.count();

  console.log("\n📊 当前数据库统计：");
  console.log(`  👤 用户: ${users}（其中模拟用户 ${seedUsers}）`);
  console.log(`  📄 帖子: ${posts}`);
  console.log(`  💬 评论: ${comments}`);
  console.log(`  ❤️  点赞: ${likes}`);
  console.log(`  🔖 收藏: ${bookmarks}`);
  console.log(`  👥 关注: ${follows}`);
  console.log(`  🤖 AI对话: ${aiConversations}`);
}

async function main() {
  console.log("🧹 CodeHub 数据清理工具\n");

  await showStats();

  console.log("\n请选择要执行的操作：");
  console.log("  1. 删除所有帖子（帖子/点赞/评论/收藏/通知）");
  console.log("  2. 删除所有评论（评论/评论点赞）");
  console.log("  3. 删除所有用户（⚠️ 会删除一切数据）");
  console.log("  4. 只删除模拟用户（保留你的真实账号）");
  console.log("  5. 删除 AI 聊天记录");
  console.log("  6. 全部删除（⚠️ 数据库清空）");
  console.log("  0. 取消退出\n");

  const choice = await ask("输入编号 (0-6): ");

  switch (choice.trim()) {
    case "1":
      const confirm1 = await ask("确认删除所有帖子相关数据？(y/n): ");
      if (confirm1.toLowerCase() === "y") await deleteAllPosts();
      break;
    case "2":
      const confirm2 = await ask("确认删除所有评论？(y/n): ");
      if (confirm2.toLowerCase() === "y") await deleteAllComments();
      break;
    case "3":
      const confirm3 = await ask("⚠️  这会删除所有用户和全部数据！确认？(输入 YES): ");
      if (confirm3 === "YES") await deleteAllUsers();
      else console.log("  已取消");
      break;
    case "4":
      const confirm4 = await ask("确认删除所有模拟用户？(y/n): ");
      if (confirm4.toLowerCase() === "y") await deleteSeedUsers();
      break;
    case "5":
      const confirm5 = await ask("确认删除所有 AI 聊天记录？(y/n): ");
      if (confirm5.toLowerCase() === "y") await deleteAIChats();
      break;
    case "6":
      const confirm6 = await ask("⚠️  这会清空整个数据库！确认？(输入 DELETE ALL): ");
      if (confirm6 === "DELETE ALL") {
        await deleteAllUsers();
      } else {
        console.log("  已取消");
      }
      break;
    case "0":
      console.log("👋 已退出");
      break;
    default:
      console.log("❌ 无效选项");
  }

  if (choice.trim() !== "0") {
    await showStats();
  }
}

main()
  .catch((e) => {
    console.error("❌ 失败:", e);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
    prisma.$disconnect();
  });