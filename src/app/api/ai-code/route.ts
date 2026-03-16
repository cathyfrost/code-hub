import { validateRequest } from "@/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { code, language, action } = await req.json();
    if (!code || typeof code !== "string") {
      return Response.json({ error: "缺少代码内容" }, { status: 400 });
    }

    const systemPrompts: Record<string, string> = {
      analyze:
        "你是一个专业的代码分析助手。请对用户提供的代码进行分析，包括：1）代码功能概述；2）关键逻辑解读；3）使用的技术/算法；4）潜在问题或优化建议。回复简洁有条理，使用中文。",
      explain:
        "你是一个编程教学助手。请逐行或逐块解释用户提供的代码，用通俗易懂的中文讲解每一部分的作用，适合编程初学者阅读。",
      optimize:
        "你是一个代码优化专家。请分析用户提供的代码，指出性能瓶颈、代码异味或不规范之处，并给出优化后的完整代码。用中文回复，优化后的代码用代码块包裹。",
      debug:
        "你是一个代码调试专家。请仔细检查用户提供的代码，找出其中的 bug 或潜在错误，解释原因并给出修复方案。用中文回复，修复后的代码用代码块包裹。",
    };

    const systemContent =
      systemPrompts[action] || systemPrompts["analyze"];

    const response = await fetch(
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DOUBAO_API_KEY}`,
        },
        body: JSON.stringify({
          model: "doubao-seed-2-0-pro-260215",
          messages: [
            {
              role: "system",
              content: systemContent,
            },
            {
              role: "user",
              content: `语言：${language}\n\n\`\`\`${language}\n${code}\n\`\`\``,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("豆包 API 错误:", errText);
      return Response.json({ error: "AI 分析失败" }, { status: 502 });
    }

    const data = await response.json();
    const result =
      data.choices?.[0]?.message?.content || "无法生成分析结果";

    return Response.json({ result });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}