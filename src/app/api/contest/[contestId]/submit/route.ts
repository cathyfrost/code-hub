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

function computeStatus(
  startTime: Date,
  endTime: Date,
): "UPCOMING" | "RUNNING" | "ENDED" {
  const now = new Date();
  if (now < startTime) return "UPCOMING";
  if (now > endTime) return "ENDED";
  return "RUNNING";
}

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
      return Response.json(
        { error: `不支持该语言: ${language}` },
        { status: 400 },
      );
    }

    // 验证竞赛状态
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      return Response.json({ error: "竞赛不存在" }, { status: 404 });
    }

    const realStatus = computeStatus(contest.startTime, contest.endTime);
    if (realStatus !== "RUNNING") {
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

    // 获取题目测试用例
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

    // 逐个运行测试用例
    let allPassed = true;
    let totalTime = 0;
    let totalMemory = 0;
    const results: Array<{
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      time?: string;
      memory?: number;
    }> = [];

    for (const tc of testCases) {
      try {
        const submitRes = await fetch(
          `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source_code: Buffer.from(code).toString("base64"),
              language_id: languageId,
              stdin: tc.input
                ? Buffer.from(tc.input).toString("base64")
                : "",
              cpu_time_limit: 5,
              memory_limit: 128000,
            }),
          },
        );

        if (!submitRes.ok) {
          return Response.json(
            { error: "Judge0 服务异常" },
            { status: 502 },
          );
        }

        const result = await submitRes.json();

        const decode = (str: string | null) => {
          if (!str) return "";
          try {
            return Buffer.from(str, "base64").toString("utf-8");
          } catch {
            return str;
          }
        };

        const stdout = decode(result.stdout).trim();
        const stderr =
          decode(result.stderr) || decode(result.compile_output);
        const statusId = result.status?.id ?? 0;
        const caseTime = result.time || null;
        const caseMemory = result.memory || null;

        if (caseTime) totalTime += parseFloat(caseTime);
        if (caseMemory) totalMemory += caseMemory;

        if (statusId !== 3) {
          const errorMsg = stderr || `运行错误 (状态码: ${statusId})`;
          results.push({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: errorMsg,
            passed: false,
            time: caseTime,
            memory: caseMemory,
          });
          allPassed = false;

          if (statusId === 6) {
            const currentIdx = results.length;
            for (let j = currentIdx; j < testCases.length; j++) {
              results.push({
                input: testCases[j].input,
                expected: testCases[j].expectedOutput,
                actual: "（编译错误，未执行）",
                passed: false,
              });
            }
            break;
          }
          continue;
        }

        const passed = stdout === tc.expectedOutput.trim();
        if (!passed) allPassed = false;

        results.push({
          input: tc.input,
          expected: tc.expectedOutput,
          actual: stdout,
          passed,
          time: caseTime,
          memory: caseMemory,
        });
      } catch (err) {
        allPassed = false;
        results.push({
          input: tc.input,
          expected: tc.expectedOutput,
          actual: `系统错误: ${err instanceof Error ? err.message : "未知错误"}`,
          passed: false,
        });
      }
    }

    // 计算罚时
    const penalty = Math.floor(
      (Date.now() - new Date(contest.startTime).getTime()) / 60000,
    );

    const failedCount = await prisma.contestSubmission.count({
      where: {
        contestId,
        userId: user.id,
        quizId,
        passed: false,
      },
    });

    const totalPenalty = allPassed ? penalty + failedCount * 20 : 0;

    // 保存提交记录（含 time 和 memory）
    await prisma.contestSubmission.create({
      data: {
        contestId,
        userId: user.id,
        quizId,
        code,
        language,
        passed: allPassed,
        penalty: totalPenalty,
        time: totalTime > 0 ? totalTime : null,
        memory: totalMemory > 0 ? totalMemory : null,
      },
    });

    return Response.json({
      allPassed,
      penalty: totalPenalty,
      results,
    });
  } catch (error) {
    console.error("竞赛提交失败:", error);
    return Response.json({ error: "判题服务异常" }, { status: 500 });
  }
}