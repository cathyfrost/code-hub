import "dotenv/config";
import { StreamChat } from "stream-chat";

const apiKey =
  process.env.NEXT_PUBLIC_STREAM_KEY ||
  process.env.NEXT_PUBLIC_STREAM_API_KEY;

const apiSecret = process.env.STREAM_SECRET;

if (!apiKey || !apiSecret) {
  console.error("❌ 缺少 NEXT_PUBLIC_STREAM_KEY / NEXT_PUBLIC_STREAM_API_KEY 或 STREAM_SECRET");
  process.exit(1);
}

const client = StreamChat.getInstance(apiKey, apiSecret);

const CHANNEL_TYPE = "messaging";
const LIMIT = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitTask(taskId: string) {
  while (true) {
    const task: any = await client.getTask(taskId);

    console.log(`  task ${taskId}: ${task.status}`);

    if (task.status === "completed") {
      return;
    }

    if (task.status === "failed") {
      throw new Error(`删除任务失败：${JSON.stringify(task)}`);
    }

    await sleep(1000);
  }
}

async function main() {
  let totalDeleted = 0;
  let round = 1;

  console.log(`🔍 正在查找所有 ${CHANNEL_TYPE} 类型频道...`);

  while (true) {
    console.log(`\n第 ${round} 轮查询...`);

    const channels = await client.queryChannels(
      { type: CHANNEL_TYPE },
      { last_message_at: -1 },
      {
        limit: LIMIT,
        offset: 0,
        state: false,
        watch: false,
      },
    );

    if (channels.length === 0) {
      break;
    }

    const cids = channels.map((channel) => channel.cid);

    console.log(`找到 ${cids.length} 个频道：`);
    for (const cid of cids) {
      console.log(`  - ${cid}`);
    }

    console.log("\n🚮 正在提交 hard delete 任务...");

    const response: any = await client.deleteChannels(cids, {
      hard_delete: true,
    });

    totalDeleted += cids.length;

    const taskId = response.task_id;

    if (taskId) {
      console.log(`任务 ID: ${taskId}`);
      await waitTask(taskId);
    } else {
      console.log("⚠️ 没有返回 task_id，响应：", response);
    }

    round++;

    // 删除后频道集合会变化，所以不要 offset += LIMIT。
    // 永远从 offset 0 继续查下一批。
    await sleep(1000);
  }

  console.log("\n" + "═".repeat(50));
  console.log(`🎉 完成。共提交硬删除 ${totalDeleted} 个频道。`);
  console.log("如果还有无法重建的旧频道，说明它可能已经被 soft delete，普通查询查不到。");
}

main()
  .catch((err) => {
    console.error("❌ 执行失败：", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });