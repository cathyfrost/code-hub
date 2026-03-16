import { validateRequest } from "@/auth";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `你是一个图形结构生成助手。根据用户输入，生成图形的逻辑结构（节点和连接关系）。

你必须严格只返回一个 JSON 对象，不要包含任何其他文字、解释或 markdown 标记。

返回格式：
{
  "nodes": [
    {
      "id": "1",
      "label": "节点显示文字",
      "shape": "rectangle" | "ellipse" | "diamond",
      "color": "blue" | "green" | "yellow" | "purple" | "red" | "gray"
    }
  ],
  "edges": [
    {
      "from": "1",
      "to": "2",
      "label": ""
    }
  ],
  "direction": "vertical" | "horizontal"
}

shape 含义：
- "ellipse"：开始/结束节点
- "rectangle"：处理步骤、类、模块
- "diamond"：判断/条件分支

color 含义：
- "green"：开始/结束
- "blue"：普通处理步骤
- "yellow"：判断/条件
- "purple"：类/模块
- "red"：错误/异常
- "gray"：备注/说明

edges 的 label 用于条件分支标注，如 "是"、"否"、"true"、"false"。普通连线 label 留空字符串。

direction：流程图用 "vertical"，架构图用 "horizontal"。

规则：
- 节点 id 必须唯一，用字符串数字 "1", "2", "3"...
- label 文字简洁，不超过 15 个字
- 流程图中 diamond 节点的出边通常有两条，分别标注 "是" 和 "否"
- 确保所有 edges 的 from 和 to 都能对应到 nodes 中存在的 id

记住：只返回 JSON 对象，不要有任何其他内容。`;

const MODE_PROMPTS: Record<string, string> = {
  code2diagram:
    "请分析以下代码的主要逻辑流程，提取关键步骤和分支，生成流程图的节点和连接关系。不需要表示每一行代码，只需要表现核心逻辑。\n\n代码：\n",
  text2diagram:
    "请根据以下描述生成对应图形的节点和连接关系。\n\n描述：\n",
  template:
    "请生成以下内容的标准图形结构（节点和连接关系），要求完整、规范。\n\n要求：\n",
};

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { input, mode } = await req.json();
    if (!input || typeof input !== "string") {
      return Response.json({ error: "输入不能为空" }, { status: 400 });
    }

    const modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS["text2diagram"];

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
            { role: "user", content: modePrompt + input },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("豆包 API 错误:", errText);
      return Response.json({ error: "AI 生成失败" }, { status: 502 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // 提取 JSON 对象
    let graph;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("AI 返回内容无法解析:", raw);
        return Response.json({ error: "AI 返回格式异常" }, { status: 502 });
      }
      graph = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("JSON 解析失败:", raw);
      return Response.json({ error: "AI 返回格式异常" }, { status: 502 });
    }

    // 校验
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      return Response.json({ error: "AI 返回结构不完整" }, { status: 502 });
    }

    const validNodeIds = new Set(graph.nodes.map((n: { id: string }) => n.id));
    const validEdges = graph.edges.filter(
      (e: { from: string; to: string }) =>
        validNodeIds.has(e.from) && validNodeIds.has(e.to),
    );

    return Response.json({
      nodes: graph.nodes,
      edges: validEdges,
      direction: graph.direction || "vertical",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "内部服务器错误" }, { status: 500 });
  }
}
