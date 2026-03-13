import { validateRequest } from "@/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { content, imageUrls } = await req.json();
    if (!content || typeof content !== "string") {
      return Response.json({ error: "缺少内容" }, { status: 400 });
    }

    // 构建消息内容
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: "text",
        text: `请分析以下帖文内容：\n\n${content}`,
      },
    ];

    // 如果有图片，追加到消息中
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      for (const url of imageUrls) {
        userContent.push({
          type: "image_url",
          image_url: { url },
        });
      }
      userContent[0].text += "\n\n（帖文还附带了以上图片，请一并分析图片内容）";
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
                "你是一个编程社区的AI助手。请对用户发布的帖文进行简洁概述，包括：1）主要内容概述（1-2句话）；2）如果包含代码，分析代码的功能、使用的语言/技术栈，以及关键逻辑；3）如果包含图片，描述图片内容并分析其与帖文的关联。回复请简洁有条理，使用中文。",
            },
            {
              role: "user",
              content: userContent,
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
    const result = data.choices?.[0]?.message?.content || "无法生成分析";

    return Response.json({ result });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}