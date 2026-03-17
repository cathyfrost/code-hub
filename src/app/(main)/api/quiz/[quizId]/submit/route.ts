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

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface CaseResult {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  time?: string;
}

async function runSingleCase(
  code: string,
  languageId: number,
  stdin: string,
): Promise<{
  stdout: string;
  stderr: string;
  statusId: number;
  time?: string;
}> {
  const res = await fetch(
    `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: Buffer.from(code).toString("base64"),
        language_id: languageId,
        stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
        cpu_time_limit: 5,
        memory_limit: 128000,
      }),
    },
  );

  if (!res.ok) {
    throw new Error("Judge0 调用失败");
  }

  const result = await res.json();

  const decode = (str: string | null) => {
    if (!str) return "";
    try {
      return Buffer.from(str, "base64").toString("utf-8");
    } catch {
      return str;
    }
  };

  return {
    stdout: decode(result.stdout),
    stderr: decode(result.stderr) || decode(result.compile_output),
    statusId: result.status?.id ?? 0,
    time: result.time,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { quizId } = await params;
    const { code, language } = await req.json();

    if (!code || !language) {
      return Response.json({ error: "缺少代码或语言" }, { status: 400 });
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return Response.json(
        { error: `该语言暂不支持判题: ${language}` },
        { status: 400 },
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { testCases: true },
    });

    if (!quiz) {
      return Response.json({ error: "题目不存在" }, { status: 404 });
    }

    const testCases = quiz.testCases as unknown as TestCase[];
    if (!testCases.length) {
      return Response.json({ error: "该题目暂无测试用例" }, { status: 400 });
    }

    const results: CaseResult[] = [];
    let allPassed = true;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const { stdout, stderr, statusId, time } = await runSingleCase(
          code,
          languageId,
          tc.input,
        );

        if (statusId !== 3) {
          const errorMsg = stderr || `运行错误 (状态码: ${statusId})`;
          results.push({
            index: i,
            passed: false,
            input: tc.input,
            expected: tc.expectedOutput,
            actual: errorMsg,
            time,
          });
          allPassed = false;

          if (statusId === 6) {
            for (let j = i + 1; j < testCases.length; j++) {
              results.push({
                index: j,
                passed: false,
                input: testCases[j].input,
                expected: testCases[j].expectedOutput,
                actual: "（编译错误，未执行）",
              });
            }
            break;
          }
          continue;
        }

        const actual = stdout.trim();
        const expected = tc.expectedOutput.trim();
        const passed = actual === expected;

        if (!passed) allPassed = false;

        results.push({
          index: i,
          passed,
          input: tc.input,
          expected: tc.expectedOutput,
          actual,
          time,
        });
      } catch (err) {
        allPassed = false;
        results.push({
          index: i,
          passed: false,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: `系统错误: ${err instanceof Error ? err.message : "未知错误"}`,
        });
      }
    }

    await prisma.quizSubmission.create({
      data: {
        userId: user.id,
        quizId,
        code,
        language,
        passed: allPassed,
        results: JSON.parse(JSON.stringify(results)),
      },
    });

    const passedCases = results.filter((r) => r.passed).length;

    return Response.json({
      passed: allPassed,
      totalCases: testCases.length,
      passedCases,
      results,
    });
  } catch (error) {
    console.error("判题失败:", error);
    return Response.json({ error: "判题服务异常" }, { status: 500 });
  }
}