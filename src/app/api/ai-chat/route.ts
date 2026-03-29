import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `你是 Claude Code，CodeHub 编程学习社区的 AI 编程助手。你由 Anthropic 的技术理念启发，专注于提供高质量的编程帮助。

你的特点：
- 回答简洁有条理，使用中文
- 代码示例用 markdown 代码块包裹，标注语言
- 对初学者友好，会主动解释专业术语
- 会根据上下文给出进一步学习建议
- 支持分析代码、解释概念、调试问题、推荐学习资源
- 使用 markdown 格式输出，包括标题、列表、代码块、表格等

请始终保持友好、专业的态度。`;

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { message, conversationId } = await req.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "消息不能为空" }, { status: 400 });
    }

    let conversation;

    if (conversationId) {
      conversation = await prisma.aiConversation.findUnique({
        where: { id: conversationId, userId: user.id },
        include: {
          messages: {
            orderBy: { createAt: "asc" },
            take: 20,
          },
        },
      });
      if (!conversation) {
        return Response.json({ error: "对话不存在" }, { status: 404 });
      }
    } else {
      conversation = await prisma.aiConversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
        include: { messages: true },
      });
    }

    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const historyMessages = conversation.messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

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
            { role: "system", content: SYSTEM_PROMPT },
            ...historyMessages,
            { role: "user", content: message },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("豆包 API 错误:", errText);
      return Response.json({ error: "AI 回复失败" }, { status: 502 });
    }

    const data = await response.json();
    const aiContent =
      data.choices?.[0]?.message?.content || "抱歉，我暂时无法回复。";

    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: aiContent,
      },
    });

    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updateAt: new Date() },
    });

    return Response.json({
      conversationId: conversation.id,
      reply: aiContent,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const convId = searchParams.get("id");

    if (convId) {
      const conversation = await prisma.aiConversation.findUnique({
        where: { id: convId, userId: user.id },
        include: {
          messages: {
            orderBy: { createAt: "asc" },
          },
        },
      });
      if (!conversation) {
        return Response.json({ error: "对话不存在" }, { status: 404 });
      }
      return Response.json(conversation);
    }

    const conversations = await prisma.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updateAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        updateAt: true,
        _count: { select: { messages: true } },
      },
    });

    return Response.json(conversations);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const convId = searchParams.get("id");

    if (!convId) {
      return Response.json({ error: "缺少对话 ID" }, { status: 400 });
    }

    const conversation = await prisma.aiConversation.findUnique({
      where: { id: convId, userId: user.id },
    });

    if (!conversation) {
      return Response.json({ error: "对话不存在" }, { status: 404 });
    }

    await prisma.aiConversation.delete({
      where: { id: convId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}