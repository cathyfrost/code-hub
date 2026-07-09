/**
 * 精确硬删除指定成员组合的 Stream Chat 频道（含软删除残留）
 *
 * 使用方式：
 *   1. 把下面 USER_IDS 填成"你自己 + 想建群的人"的 Stream user_id
 *   2. 运行：npx tsx scripts/cleanup-stream-chats.ts
 *
 * 原理：
 *   软删除的 distinct 频道用 queryChannels 查不到，但仍在后台阻止
 *   普通用户重建，导致前端 "RecreateChannel not allowed" 403。
 *   这里用管理员密钥，按所有可能的成员组合重建 channel 引用后硬删除，
 *   彻底清除残留。
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

const client = StreamChat.getInstance(apiKey, apiSecret, {
  timeout: 30000, // 默认 3000ms 太短，国内直连 Stream 容易超时
});

// ⚠️ 填入涉及的所有 Stream user_id（你自己 + 想聊天/建群的人）
// 你自己的 id 是 aclt7sokeompzuga（wang yutong）
const USER_IDS = [
  "aclt7sokeompzuga",
  // "对方1的 user_id",
  // "对方2的 user_id",
];

// 生成所有 2 人及以上的成员组合（distinct 频道 id 与成员顺序无关，Stream 内部会排序）
function combinations(arr: string[], minSize = 2): string[][] {
  const result: string[][] = [];
  const n = arr.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const combo: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) combo.push(arr[i]);
    }
    if (combo.length >= minSize) result.push(combo);
  }
  return result;
}

async function cleanup() {
  console.log("🔍 开始清理指定成员组合的频道...\n");

  // 第一步：先用 queryChannels 把当前能查到的（未软删）频道硬删一遍
  const queried = await client.queryChannels(
    { type: "messaging", members: { $in: USER_IDS } },
    { last_message_at: -1 },
    { limit: 30 },
  );

  const cids = new Set<string>();
  for (const ch of queried) {
    cids.add(ch.cid);
    const names = Object.values(ch.state.members)
      .map((m) => m.user?.name || m.user_id)
      .join(", ");
    console.log(`  📌 查到频道：${ch.cid}（成员：${names}）`);
  }

  // 第二步：按所有成员组合构造 distinct 频道引用（覆盖软删除残留）
  const combos = combinations(USER_IDS, 2);
  console.log(`\n🧩 构造 ${combos.length} 个成员组合的频道引用...\n`);

  let totalDeleted = 0;
  let totalFailed = 0;

  for (const combo of combos) {
    try {
      // 不带 id、只给 members = distinct 频道，Stream 会定位到同一个 cid
      const channel = client.channel("messaging", {
        members: combo,
      } as any);

      // 硬删除（覆盖软删除残留）
      await channel.delete({ hard_delete: true });
      totalDeleted++;
      console.log(`  ✅ 已硬删除组合：[${combo.join(", ")}]`);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        JSON.stringify(error);
      // 频道不存在属正常（说明该组合没有残留），不计为失败
      if (
        typeof msg === "string" &&
        (msg.includes("does not exist") ||
          msg.includes("not found") ||
          msg.includes("Can't find channel"))
      ) {
        console.log(`  ⚪ 无残留：[${combo.join(", ")}]`);
      } else {
        totalFailed++;
        console.error(`  ❌ 删除失败 [${combo.join(", ")}] — ${msg}`);
      }
    }
  }

  console.log("\n" + "═".repeat(40));
  console.log(`🎉 完成！硬删除 ${totalDeleted} 个频道。`);
  if (totalFailed > 0) {
    console.log(`⚠️ ${totalFailed} 个删除失败，请查看上方错误信息。`);
  }
  console.log(
    "\n提示：hard_delete 为异步任务，个别频道可能需要几秒才彻底清除。",
  );
}

cleanup()
  .catch((err) => {
    console.error("❌ 脚本执行出错：", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });