import { validateRequest } from "@/auth";
import { NextRequest } from "next/server";

const ACTION_PROMPTS: Record<string, string> = {
  analyze:
    "请分析以下代码的结构、逻辑和潜在问题，给出改进建议。",
  explain:
    "请用通俗易懂的中文逐段解释以下代码的功能和执行流程，适合编程初学者阅读。",
  optimize:
    "请从性能、可读性、最佳实践三个角度优化以下代码，给出优化后的代码和说明。",
  debug:
    "请分析以下代码中的 bug 和错误，逐个指出问题原因并给出修复方案。",
};

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { code, language, action, errorOutput } = await req.json();

    if (!code || typeof code !== "string") {
      return Response.json({ error: "代码不能为空" }, { status: 400 });
    }

    const actionPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS["analyze"];

    // 拼装用户消息
    let userMessage = `${actionPrompt}\n\n语言: ${language || "未知"}\n\n代码:\n\`\`\`${language || ""}\n${code}\n\`\`\``;

    // debug 模式下附带报错信息
    if (action === "debug" && errorOutput) {
      userMessage += `\n\n程序运行时的报错/输出信息:\n\`\`\`\n${errorOutput}\n\`\`\`\n\n请结合以上报错信息，定位具体的错误原因并给出修复代码。`;
    }

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
              content:
                "你是一个专业的编程助手，擅长代码分析、调试、优化和解释。请用中文回答，回答要简洁清晰，重点突出。如果涉及代码修改，请给出完整的修复后代码。",
            },
            { role: "user", content: userMessage },
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
    const result = data.choices?.[0]?.message?.content || "AI 未返回结果";

    return Response.json({ result });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}