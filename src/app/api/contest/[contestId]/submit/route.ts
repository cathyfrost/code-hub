import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

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

// POST /api/contest/[contestId]/submit — 竞赛中提交代码
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { contestId } = await params;
    const { quizId, code, language } = await req.json();

    if (!quizId || !code || !language) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return Response.json({ error: `不支持该语言: ${language}` }, { status: 400 });
    }

    // 验证竞赛状态
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest || contest.status !== "RUNNING") {
      return Response.json({ error: "竞赛未在进行中" }, { status: 400 });
    }

    // 验证已报名
    const registration = await prisma.contestRegistration.findUnique({
      where: {
        contestId_userId: { contestId, userId: user.id },
      },
    });

    if (!registration) {
      return Response.json({ error: "你未报名该竞赛" }, { status: 403 });
    }

    // 获取该题的测试用例
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return Response.json({ error: "题目不存在" }, { status: 404 });
    }

    const testCases = quiz.testCases as Array<{
      input: string;
      expectedOutput: string;
    }>;

    // 逐个测试用例运行
    let allPassed = true;
    const results: Array<{
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
    }> = [];

    for (const tc of testCases) {
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

      if (!passed) allPassed = false;

      results.push({
        input: tc.input,
        expected: tc.expectedOutput,
        actual: stdout,
        passed,
      });
    }

    // 计算罚时：从竞赛开始到现在的分钟数
    const penalty = Math.floor(
      (Date.now() - new Date(contest.startTime).getTime()) / 60000,
    );

    // 查询该用户该题之前的失败提交次数（每次失败 +20 分钟罚时）
    const failedCount = await prisma.contestSubmission.count({
      where: {
        contestId,
        userId: user.id,
        quizId,
        passed: false,
      },
    });

    const totalPenalty = allPassed ? penalty + failedCount * 20 : 0;

    // 保存提交记录
    const submission = await prisma.contestSubmission.create({
      data: {
        contestId,
        userId: user.id,
        quizId,
        code,
        language,
        passed: allPassed,
        penalty: totalPenalty,
      },
    });

    return Response.json({
      submission,
      results,
      allPassed,
      penalty: totalPenalty,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
