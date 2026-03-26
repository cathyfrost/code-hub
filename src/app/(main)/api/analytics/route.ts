import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const userId = user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      totalLikesReceived,
      totalCommentsReceived,
      totalBookmarksReceived,
      totalFollowers,
      totalFollowing,
      totalLikesGiven,
      totalCommentsGiven,
      totalBookmarksGiven,
      totalQuizSubmissions,
      passedQuizSubmissions,
      quizSubmissions,
      totalNotebooks,
      totalNotebookFolders,
      totalAiConversations,
      totalAiMessages,
      recentPosts,
      recentLikesReceived,
      recentCommentsReceived,
      userPosts,
      activityPosts,
      activityComments,
      activityLikes,
      totalNotifications,
      unreadNotifications,
      globalTagStats,
      topPosts,
      recentFollowers,
      followerGrowthRaw,
    ] = await Promise.all([
      prisma.post.count({ where: { userId } }),
      prisma.like.count({ where: { post: { userId } } }),
      prisma.comment.count({ where: { post: { userId }, userId: { not: userId } } }),
      prisma.bookmark.count({ where: { post: { userId } } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.like.count({ where: { userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.quizSubmission.count({ where: { userId } }),
      prisma.quizSubmission.count({ where: { userId, passed: true } }),
      prisma.quizSubmission.findMany({
        where: { userId },
        select: {
          quizId: true,
          passed: true,
          language: true,
          createAt: true,
          quiz: { select: { id: true, title: true, difficulty: true, tags: true } },
        },
        orderBy: { createAt: "desc" },
      }),
      prisma.notebook.count({ where: { userId } }),
      prisma.notebookFolder.count({ where: { userId } }),
      prisma.aiConversation.count({ where: { userId } }),
      prisma.aiMessage.count({ where: { conversation: { userId } } }),
      prisma.post.findMany({
        where: { userId, createAt: { gte: thirtyDaysAgo } },
        select: { createAt: true },
        orderBy: { createAt: "asc" },
      }),
      prisma.like.findMany({
        where: { post: { userId, createAt: { gte: thirtyDaysAgo } } },
        select: { post: { select: { createAt: true } } },
      }),
      prisma.comment.findMany({
        where: { post: { userId }, createAt: { gte: thirtyDaysAgo }, userId: { not: userId } },
        select: { createAt: true },
      }),
      prisma.post.findMany({
        where: { userId },
        select: {
          tags: true,
          codeBlocks: true,
          difficulty: true,
          createAt: true,
          _count: { select: { likes: true, comments: true, bookmarks: true } },
        },
        orderBy: { createAt: "desc" },
      }),
      prisma.post.findMany({
        where: { userId, createAt: { gte: sixMonthsAgo } },
        select: { createAt: true },
      }),
      prisma.comment.findMany({
        where: { userId, createAt: { gte: sixMonthsAgo } },
        select: { createAt: true },
      }),
      prisma.like.findMany({
        where: { userId },
        select: { post: { select: { createAt: true } } },
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
      prisma.notification.count({ where: { recipientId: userId, read: false } }),
      // 全站话题标签统计（与主页热门话题 TrendsSidebar 完全一致的 SQL）
      prisma.$queryRawUnsafe(`
        WITH cleaned AS (
          SELECT regexp_replace(content, E'\`\`\`[\\\\s\\\\S]*?\`\`\`', '', 'g') AS clean_content
          FROM posts
        ),
        stripped AS (
          SELECT regexp_replace(clean_content, E'\`[^\`]+\`', '', 'g') AS stripped_content
          FROM cleaned
        )
        SELECT hashtag, COUNT(*) AS count
        FROM (
          SELECT LOWER(unnest(regexp_matches(stripped_content, '#[^\\s#<>{};()]{2,}', 'g'))) AS hashtag
          FROM stripped
        ) t
        WHERE hashtag !~ '^#(include|define|pragma|ifdef|ifndef|endif|import|if$|else$|error|warning|undef|line)'
          AND hashtag !~ '^#\\d+$'
        GROUP BY hashtag
        ORDER BY count DESC, hashtag ASC
        LIMIT 15
      `) as Promise<{ hashtag: string; count: bigint }[]>,
      prisma.post.findMany({
        where: { userId },
        select: {
          id: true,
          content: true,
          createAt: true,
          _count: { select: { likes: true, comments: true, bookmarks: true } },
        },
        orderBy: { likes: { _count: "desc" } },
        take: 5,
      }),
      prisma.follow.findMany({
        where: { followingId: userId },
        select: {
          followerId: true,
          follower: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.follow.findMany({
        where: { followingId: userId, createAt: { gte: thirtyDaysAgo } },
        select: { createAt: true },
        orderBy: { createAt: "asc" },
      }),
    ]);

    // 1. 每日发帖趋势
    const dailyPostTrend = generateDailyTrend(
      recentPosts.map((p) => p.createAt),
      thirtyDaysAgo,
      now,
    );

    // 2. 每日点赞趋势
    const dailyLikeTrend = generateDailyTrend(
      recentLikesReceived.map((l) => l.post!.createAt),
      thirtyDaysAgo,
      now,
    );

    // 3. 每日评论趋势
    const dailyCommentTrend = generateDailyTrend(
      recentCommentsReceived.map((c) => c.createAt),
      thirtyDaysAgo,
      now,
    );

    // 4. 合并每日趋势
    const dailyTrend = dailyPostTrend.map((day, index) => ({
      date: day.date,
      label: day.label,
      posts: day.count,
      likes: dailyLikeTrend[index]?.count || 0,
      comments: dailyCommentTrend[index]?.count || 0,
    }));

    // 5. 标签分布（全站，与主页热门话题一致）
    const tagDistribution = (globalTagStats as { hashtag: string; count: bigint }[]).map((row) => ({
      name: row.hashtag.replace(/^#/, ""),
      value: Number(row.count),
    }));

    // 5b. 用户自己的帖子标签分布
    const userTagCount: Record<string, number> = {};
    userPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        userTagCount[tag] = (userTagCount[tag] || 0) + 1;
      });
    });
    const userTagDistribution = Object.entries(userTagCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    // 6. 题库难度分布
    const quizDifficultyMap: Record<string, { total: number; passed: number }> = {};
    quizSubmissions.forEach((sub) => {
      const diff = sub.quiz.difficulty;
      if (!quizDifficultyMap[diff]) quizDifficultyMap[diff] = { total: 0, passed: 0 };
      quizDifficultyMap[diff].total++;
      if (sub.passed) quizDifficultyMap[diff].passed++;
    });
    const quizDifficultyDistribution = Object.entries(quizDifficultyMap).map(
      ([difficulty, data]) => ({
        difficulty: difficulty === "easy" ? "简单" : difficulty === "medium" ? "中等" : "困难",
        total: data.total,
        passed: data.passed,
        rate: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0,
      }),
    );

    // 7. 编程语言使用分布
    const langCount: Record<string, number> = {};
    quizSubmissions.forEach((sub) => {
      langCount[sub.language] = (langCount[sub.language] || 0) + 1;
    });
    const languageDistribution = Object.entries(langCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 8. 活跃度热力图
    const activityMap: Record<string, number> = {};
    activityPosts.forEach((p) => {
      const key = p.createAt.toISOString().split("T")[0];
      activityMap[key] = (activityMap[key] || 0) + 2;
    });
    activityComments.forEach((c) => {
      const key = c.createAt.toISOString().split("T")[0];
      activityMap[key] = (activityMap[key] || 0) + 1;
    });
    activityLikes.forEach((l) => {
      if (l.post) {
        const key = l.post.createAt.toISOString().split("T")[0];
        activityMap[key] = (activityMap[key] || 0) + 1;
      }
    });
    const heatmapData = Object.entries(activityMap).map(([date, count]) => ({ date, count }));

    // 9. 技能雷达图（基于全站帖子 hashtag，与标签分布同源）
    const skillMap: Record<string, number> = {};
    tagDistribution.forEach((tag) => {
      const category = mapTagToSkill(tag.name);
      skillMap[category] = (skillMap[category] || 0) + tag.value;
    });
    const maxSkill = Math.max(...Object.values(skillMap), 1);
    const skillRadar = Object.entries(skillMap)
      .map(([skill, value]) => ({ skill, value: Math.round((value / maxSkill) * 100) }))
      .filter((s) => s.skill !== "其他")
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 10. 互动效率
    const avgLikesPerPost = totalPosts > 0 ? (totalLikesReceived / totalPosts).toFixed(1) : "0";
    const avgCommentsPerPost = totalPosts > 0 ? (totalCommentsReceived / totalPosts).toFixed(1) : "0";
    const avgBookmarksPerPost = totalPosts > 0 ? (totalBookmarksReceived / totalPosts).toFixed(1) : "0";

    // 11. 每周活跃天数
    const last7DaysActive = new Set([
      ...activityPosts.filter((p) => p.createAt >= sevenDaysAgo).map((p) => p.createAt.toISOString().split("T")[0]),
      ...activityComments.filter((c) => c.createAt >= sevenDaysAgo).map((c) => c.createAt.toISOString().split("T")[0]),
    ]).size;

    // 12. Top 帖子
    const topPostsFormatted = topPosts.map((p) => ({
      id: p.id,
      content: p.content.substring(0, 80) + (p.content.length > 80 ? "..." : ""),
      likes: p._count.likes,
      comments: p._count.comments,
      bookmarks: p._count.bookmarks,
      total: p._count.likes + p._count.comments + p._count.bookmarks,
      createAt: p.createAt,
    }));

    // 13. 代码帖占比
    const postsWithCode = userPosts.filter((p) => p.codeBlocks > 0).length;
    const codePostRatio = totalPosts > 0 ? Math.round((postsWithCode / totalPosts) * 100) : 0;

    // 14. 独立通过题目
    const uniquePassedQuizIds = new Set(quizSubmissions.filter((s) => s.passed).map((s) => s.quizId));

    // 15. 最近提交记录
    const recentSubmissions = quizSubmissions.slice(0, 10).map((s) => ({
      id: s.quizId,
      quizTitle: s.quiz.title,
      difficulty: s.quiz.difficulty,
      language: s.language,
      passed: s.passed,
      createAt: s.createAt,
    }));

    // 16. 粉丝增长趋势
    const followerGrowthMap: Record<string, number> = {};
    followerGrowthRaw.forEach((f) => {
      const key = f.createAt.toISOString().split("T")[0];
      followerGrowthMap[key] = (followerGrowthMap[key] || 0) + 1;
    });
    const followerGrowth: { date: string; label: string; count: number; cumulative: number }[] = [];
    let cumulative = totalFollowers - followerGrowthRaw.length;
    const fgCurrent = new Date(thirtyDaysAgo);
    while (fgCurrent <= now) {
      const key = fgCurrent.toISOString().split("T")[0];
      const month = fgCurrent.getMonth() + 1;
      const day = fgCurrent.getDate();
      const dayCount = followerGrowthMap[key] || 0;
      cumulative += dayCount;
      followerGrowth.push({ date: key, label: `${month}/${day}`, count: dayCount, cumulative });
      fgCurrent.setDate(fgCurrent.getDate() + 1);
    }

    return NextResponse.json({
      overview: {
        totalPosts,
        totalLikesReceived,
        totalCommentsReceived,
        totalBookmarksReceived,
        totalFollowers,
        totalFollowing,
        totalLikesGiven,
        totalCommentsGiven,
        totalBookmarksGiven,
        totalNotebooks,
        totalNotebookFolders,
        totalAiConversations,
        totalAiMessages,
        totalNotifications,
        unreadNotifications,
        avgLikesPerPost,
        avgCommentsPerPost,
        avgBookmarksPerPost,
        last7DaysActive,
        codePostRatio,
      },
      quiz: {
        totalSubmissions: totalQuizSubmissions,
        passedSubmissions: passedQuizSubmissions,
        uniquePassed: uniquePassedQuizIds.size,
        passRate: totalQuizSubmissions > 0 ? Math.round((passedQuizSubmissions / totalQuizSubmissions) * 100) : 0,
        difficultyDistribution: quizDifficultyDistribution,
        languageDistribution,
        recentSubmissions,
      },
      trends: { dailyTrend },
      distributions: { tagDistribution, userTagDistribution, skillRadar },
      heatmap: heatmapData,
      topPosts: topPostsFormatted,
      recentFollowers: recentFollowers.map((f) => ({
        username: f.follower.username,
        displayName: f.follower.displayName,
        avatarUrl: f.follower.avatarUrl,
      })),
      followerGrowth,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "获取数据分析失败" }, { status: 500 });
  }
}

function generateDailyTrend(
  dates: Date[],
  start: Date,
  end: Date,
): { date: string; label: string; count: number }[] {
  const result: { date: string; label: string; count: number }[] = [];
  const countMap: Record<string, number> = {};
  dates.forEach((d) => {
    const key = d.toISOString().split("T")[0];
    countMap[key] = (countMap[key] || 0) + 1;
  });
  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    const month = current.getMonth() + 1;
    const day = current.getDate();
    result.push({ date: key, label: `${month}/${day}`, count: countMap[key] || 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function mapTagToSkill(tag: string): string {
  const lower = tag.toLowerCase();
  const mapping: Record<string, string[]> = {
    前端: [
      "javascript","typescript","react","vue","next","nextjs","css","html","tailwind",
      "angular","svelte","solid","astro","nuxt","remix","gatsby","sass","less","scss",
      "webpack","vite","rollup","esbuild","turbopack","postcss","styled-components",
      "emotion","antd","element-ui","mui","bootstrap","jquery","dom","canvas","webgl",
      "three.js","d3","echarts","svg","pwa","web","前端","小程序","微信小程序","uniapp",
      "taro","electron","tauri","wasm","webassembly","deno","bun",
    ],
    后端: [
      "node","nodejs","java","spring","springboot","python","go","golang","rust",
      "ruby","rails","php","laravel","c#","csharp",".net","dotnet","asp.net",
      "express","nestjs","koa","fastify","django","flask","fastapi","gin","fiber",
      "actix","rocket","grpc","graphql","rest","restful","api","microservice",
      "微服务","后端","serverless","lambda","中间件","消息队列","rabbitmq","kafka",
      "rocketmq","celery","websocket","socket","tcp","udp","http","nginx","apache",
      "tomcat","netty",
    ],
    算法: [
      "算法","数据结构","leetcode","动态规划","排序","二分","递归","数组","链表",
      "栈","队列","树","图","哈希","双指针","滑动窗口","数学","贪心","回溯",
      "bfs","dfs","拓扑排序","并查集","线段树","字典树","trie","堆","优先队列",
      "前缀和","差分","位运算","分治","模拟","枚举","dp","acm","刷题","笔试",
      "面试题","algorithm","competitive",
    ],
    数据库: [
      "sql","mysql","postgresql","postgres","mongodb","redis","数据库","prisma","orm",
      "sqlite","mariadb","oracle","mssql","cassandra","dynamodb","neo4j","influxdb",
      "elasticsearch","es","clickhouse","tidb","oceanbase","supabase","firebase",
      "drizzle","typeorm","sequelize","mybatis","hibernate","索引","事务","分库分表",
      "数据建模","etl",
    ],
    DevOps: [
      "docker","k8s","kubernetes","ci","cd","cicd","linux","nginx","aws","azure",
      "gcp","阿里云","腾讯云","华为云","devops","terraform","ansible","jenkins",
      "github actions","gitlab","运维","部署","容器","镜像","helm","prometheus",
      "grafana","监控","日志","elk","shell","bash","自动化","云原生","cloud",
      "负载均衡","cdn","ssl","https","ssh","服务器",
    ],
    AI: [
      "ai","机器学习","深度学习","pytorch","tensorflow","nlp","大模型","chatgpt",
      "gpt","llm","bert","transformer","神经网络","cnn","rnn","lstm","gan",
      "强化学习","计算机视觉","cv","目标检测","图像识别","语音识别","推荐系统",
      "数据挖掘","特征工程","sklearn","pandas","numpy","jupyter","kaggle",
      "huggingface","langchain","rag","embedding","向量数据库","pinecone",
      "openai","claude","gemini","diffusion","stable diffusion","midjourney",
      "人工智能","智能","模型","训练","推理","微调","finetune","lora",
    ],
    移动端: [
      "ios","android","flutter","react native","swift","kotlin","移动",
      "swiftui","jetpack compose","dart","objective-c","expo","capacitor",
      "ionic","cordova","app","移动开发","手机","tablet","响应式",
      "适配","hybrid","原生","native",
    ],
    安全: [
      "安全","security","网络安全","渗透","xss","csrf","sql注入","加密",
      "密码学","oauth","jwt","认证","授权","防火墙","漏洞","ctf",
      "逆向","reverse","pwn","web安全","身份验证","https","ssl","tls",
    ],
    测试: [
      "测试","test","testing","单元测试","集成测试","e2e","cypress","playwright",
      "jest","vitest","mocha","pytest","junit","selenium","自动化测试",
      "tdd","bdd","mock","测试用例","qa","质量",
    ],
    工具: [
      "git","github","gitlab","vscode","vim","neovim","ide","编辑器",
      "工具","效率","terminal","命令行","cli","npm","yarn","pnpm",
      "brew","包管理","正则","regex","markdown","latex","文档",
      "开源","open source","chrome","插件","extension","调试","debug",
      "性能优化","重构","设计模式","架构","clean code","代码规范",
      "eslint","prettier","lint","monorepo","turborepo",
    ],
    大数据: [
      "大数据","hadoop","spark","flink","hive","hbase","数据仓库",
      "数据湖","数据分析","bi","tableau","powerbi","superset",
      "airflow","数据管道","pipeline","batch","streaming","实时计算",
      "离线计算","mapreduce","zookeeper","hdfs","presto","trino","dbt",
    ],
    区块链: [
      "区块链","blockchain","web3","solidity","ethereum","以太坊","比特币",
      "bitcoin","nft","defi","智能合约","smart contract","dapp","ipfs",
      "crypto","挖矿","共识","polygon","solana",
    ],
    嵌入式: [
      "嵌入式","embedded","stm32","arduino","树莓派","raspberry","单片机",
      "mcu","rtos","freertos","rt-thread","arm","risc-v","fpga","verilog",
      "iot","物联网","传感器","gpio","uart","spi","i2c","pcb","硬件",
      "固件","firmware","驱动","driver",
    ],
  };
  for (const [skill, keywords] of Object.entries(mapping)) {
    if (keywords.some((kw) => lower.includes(kw))) return skill;
  }
  return "其他";
}