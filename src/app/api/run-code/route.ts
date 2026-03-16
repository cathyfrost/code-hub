import { validateRequest } from "@/auth";
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
  sql: 82,
};

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { code, language, stdin } = await req.json();
    if (!code || typeof code !== "string") {
      return Response.json({ error: "缺少代码" }, { status: 400 });
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return Response.json(
        { error: `不支持运行该语言: ${language}` },
        { status: 400 },
      );
    }

    const submitRes = await fetch(
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

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      console.error("Judge0 错误:", errText);
      return Response.json(
        { error: "代码提交失败，请确认 Judge0 服务正在运行" },
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

    const stdout = decode(result.stdout);
    const stderr = decode(result.stderr);
    const compileOutput = decode(result.compile_output);
    const statusId = result.status?.id;
    const statusDesc = result.status?.description || "Unknown";

    let output = "";
    let isError = false;

    switch (statusId) {
      case 3:
        output = stdout || "执行完成（无输出）";
        break;
      case 5:
        output = "执行超时（超过 5 秒限制）";
        isError = true;
        break;
      case 6:
        output = `编译错误:\n${compileOutput}`;
        isError = true;
        break;
      case 7:
      case 11:
      case 12:
      case 13:
      case 14:
      case 15:
        output = stderr
          ? `运行错误 (${statusDesc}):\n${stderr}`
          : `运行错误: ${statusDesc}`;
        isError = true;
        break;
      default:
        output = stderr || compileOutput || `错误: ${statusDesc}`;
        isError = true;
    }

    output = output.replace(/\n+$/, "");

    return Response.json({
      output,
      isError,
      status: statusDesc,
      time: result.time,
      memory: result.memory,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}