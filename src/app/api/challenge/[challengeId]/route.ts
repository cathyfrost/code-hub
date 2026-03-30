import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/challenge/[challengeId] — 查询对战状态（含双方提交记录）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { challengeId } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        opponent: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            description: true,
            examples: true,
            testCases: true,
            starterCode: true,
            hints: true,
            tags: true,
          },
        },
        submissions: {
          select: {
            id: true,
            userId: true,
            passed: true,
            language: true,
            time: true,
            memory: true,
            createAt: true,
          },
          orderBy: { createAt: "asc" },
        },
      },
    });

    if (!challenge) {
      return Response.json({ error: "对战不存在" }, { status: 404 });
    }

    if (
      challenge.challengerId !== user.id &&
      challenge.opponentId !== user.id
    ) {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    // 自动检查超时 → 结算
    if (challenge.status === "ONGOING" && challenge.startedAt) {
      const elapsed =
        (Date.now() - new Date(challenge.startedAt).getTime()) / 1000;
      if (elapsed > challenge.timeLimit) {
        const updated = await settleChallenge(challengeId);
        return Response.json({
          ...challenge,
          ...updated,
          status: "FINISHED",
        });
      }
    }

    return Response.json(challenge);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// POST /api/challenge/[challengeId] — 提交代码
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";

  const LANGUAGE_MAP: Record<string, number> = {
    c: 50,
    cpp: 54,
    java: 62,
    javascript: 63,
    typescript: 74,
    python: 71,
    go: 60,
    rust: 73,
  };

  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { challengeId } = await params;
    const { code, language } = await req.json();

    if (!code || !language) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return Response.json(
        { error: `不支持该语言: ${language}` },
        { status: 400 },
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { quiz: true },
    });

    if (!challenge || challenge.status !== "ONGOING") {
      return Response.json({ error: "对战未在进行中" }, { status: 400 });
    }

    if (
      challenge.challengerId !== user.id &&
      challenge.opponentId !== user.id
    ) {
      return Response.json({ error: "你不是该对战的参与者" }, { status: 403 });
    }

    // 检查超时
    if (challenge.startedAt) {
      const elapsed =
        (Date.now() - new Date(challenge.startedAt).getTime()) / 1000;
      if (elapsed > challenge.timeLimit) {
        await settleChallenge(challengeId);
        return Response.json({ error: "对战已超时" }, { status: 400 });
      }
    }

    // 检查是否已经通过（已 AC 不允许重复提交）
    const alreadyPassed = await prisma.challengeSubmission.findFirst({
      where: { challengeId, userId: user.id, passed: true },
    });
    if (alreadyPassed) {
      return Response.json({ error: "你已通过此题" }, { status: 400 });
    }

    // 运行测试用例
    const testCases = (challenge.quiz?.testCases ?? []) as Array<{
      input: string;
      expectedOutput: string;
    }>;

    let passedCount = 0;
    const results: Array<{
      index: number;
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      time: string | null;
      memory: number | null;
    }> = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const submitRes = await fetch(
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_code: Buffer.from(code).toString("base64"),
            language_id: languageId,
            stdin: tc.input ? Buffer.from(tc.input).toString("base64") : "",
            cpu_time_limit: 5,
            memory_limit: 128000,
          }),
        },
      );

      if (!submitRes.ok) {
        return Response.json({ error: "Judge0 服务异常" }, { status: 502 });
      }

      const result = await submitRes.json();
      const stdout = result.stdout
        ? Buffer.from(result.stdout, "base64").toString("utf-8").trim()
        : "";
      const passed =
        result.status?.id === 3 && stdout === tc.expectedOutput.trim();

      if (passed) passedCount++;

      results.push({
        index: i,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: stdout,
        passed,
        time: result.time ?? null,
        memory: result.memory ?? null,
      });
    }

    const allPassed = passedCount === testCases.length;

    // 计算总耗时和内存
    const totalTime = results
      .filter((r) => r.time)
      .reduce((sum, r) => sum + parseFloat(r.time || "0"), 0);
    const totalMemory = results
      .filter((r) => r.memory)
      .reduce((sum, r) => sum + (r.memory || 0), 0);

    // 保存提交
    await prisma.challengeSubmission.create({
      data: {
        challengeId,
        userId: user.id,
        code,
        language,
        passed: allPassed,
        time: totalTime,
        memory: totalMemory,
      },
    });

    // 如果通过了，检查是否需要结算
    if (allPassed) {
      // 检查对手是否也已通过
      const opponentId =
        challenge.challengerId === user.id
          ? challenge.opponentId
          : challenge.challengerId;

      const opponentPassed = opponentId
        ? await prisma.challengeSubmission.findFirst({
            where: { challengeId, userId: opponentId, passed: true },
          })
        : null;

      if (opponentPassed) {
        // 双方都通过了 → 比较提交时间，先提交者赢
        await settleChallenge(challengeId);
      } else {
        // 对手还没通过，先标记自己通过，等对手提交或超时再结算
        // 不立即结束，给对手机会
      }
    }

    return Response.json({
      results,
      allPassed,
      passedCount,
      totalCases: testCases.length,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

// PUT /api/challenge/[challengeId] — 放弃比赛（退出判负）
export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { challengeId } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.status !== "ONGOING") {
      return Response.json({ error: "对战未在进行中" }, { status: 400 });
    }

    if (
      challenge.challengerId !== user.id &&
      challenge.opponentId !== user.id
    ) {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    // 退出者判负，对手胜
    const winnerId =
      challenge.challengerId === user.id
        ? challenge.opponentId
        : challenge.challengerId;

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: "FINISHED",
        winnerId,
        endedAt: new Date(),
      },
    });

    return Response.json({ success: true, winnerId });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

/**
 * 结算对战胜负
 * 优先级：1.通过测试点多 → 2.先提交通过 → 3.运行耗时少
 */
async function settleChallenge(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      submissions: {
        orderBy: { createAt: "asc" },
      },
    },
  });

  if (!challenge) return {};

  const playerIds = [
    challenge.challengerId,
    challenge.opponentId,
  ].filter(Boolean) as string[];

  // 统计每人最佳成绩
  const stats = playerIds.map((pid) => {
    const subs = challenge.submissions.filter((s) => s.userId === pid);
    const passedSub = subs.find((s) => s.passed);
    // 失败提交次数作为罚时
    const failedCount = subs.filter((s) => !s.passed).length;

    return {
      userId: pid,
      passed: !!passedSub,
      passedAt: passedSub?.createAt ?? null,
      failedCount,
      totalTime: passedSub?.time ?? Infinity,
      totalMemory: passedSub?.memory ?? Infinity,
    };
  });

  // 排序：通过 > 未通过，通过时间早 > 晚，耗时少 > 多
  stats.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    if (a.passed && b.passed && a.passedAt && b.passedAt) {
      const timeDiff = a.passedAt.getTime() - b.passedAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.totalTime ?? 0) - (b.totalTime ?? 0);
    }
    // 都没通过 → 平局
    return 0;
  });

  const winnerId =
    stats[0]?.passed && (!stats[1]?.passed || stats[0].passed)
      ? stats[0].userId
      : stats[0]?.passed === stats[1]?.passed
        ? null
        : stats[0]?.userId ?? null;

  const updated = await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      status: "FINISHED",
      winnerId,
      endedAt: new Date(),
    },
  });

  return updated;
}