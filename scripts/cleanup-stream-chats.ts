/**
 * 一键清除 Stream Chat 所有聊天频道及聊天记录
 *
 * 使用方式：
 *   npx tsx scripts/cleanup-stream-chats.ts
 *
 * 注意：此操作不可逆，执行前请确认！
 */

import "dotenv/config";
import { StreamChat } from "stream-chat";

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
const apiSecret = process.env.STREAM_SECRET;

if (!apiKey || !apiSecret) {
  console.error("❌ 缺少环境变量 NEXT_PUBLIC_STREAM_KEY 或 STREAM_SECRET");
  console.error("   请确保 .env 文件中已配置这两个变量");
  process.exit(1);
}

const client = StreamChat.getInstance(apiKey, apiSecret);

async function cleanupAllChats() {
  console.log("🔍 正在查询所有聊天频道...\n");

  let totalDeleted = 0;
  const offset = 0;
  const limit = 100;

  // 分页查询并删除所有 messaging 类型频道
  while (true) {
  const channels = await client.queryChannels(
  { type: "messaging" },
  { last_message_at: -1 },
  { limit, offset },
);

    if (channels.length === 0) break;

    for (const channel of channels) {
      const memberNames = Object.values(channel.state.members)
        .map((m) => m.user?.name || m.user_id)
        .join(", ");

      try {
        await channel.delete();
        totalDeleted++;
        console.log(
          `  ✅ 已删除：${channel.data?.name || channel.id}（成员：${memberNames}）`,
        );
      } catch (error: any) {
        console.error(
          `  ❌ 删除失败：${channel.id} — ${error.message || error}`,
        );
      }
    }

    // 如果本批次不满 limit，说明已经是最后一页
    if (channels.length < limit) break;

    // 因为删除后索引会变，不递增 offset
  }

  console.log("\n" + "═".repeat(40));

  if (totalDeleted > 0) {
    console.log(`🎉 完成！共删除 ${totalDeleted} 个聊天频道及其所有聊天记录。`);
  } else {
    console.log("📭 没有找到任何聊天频道，无需清理。");
  }
}

cleanupAllChats()
  .catch((err) => {
    console.error("❌ 脚本执行出错：", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });