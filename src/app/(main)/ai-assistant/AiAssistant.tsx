"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Send,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Code,
  BookOpen,
  Zap,
  Bug,
  Lightbulb,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  User,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/* ------------------------------------------------------------------ */
/*  类型                                                               */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createAt: string;
}

interface Conversation {
  id: string;
  title: string;
  updateAt: string;
  _count: { messages: number };
}

/* ------------------------------------------------------------------ */
/*  预设模板                                                           */
/* ------------------------------------------------------------------ */

const PRESET_TEMPLATES = [
  {
    icon: Code,
    label: "解释这段代码",
    prompt:
      "请帮我解释以下代码的逻辑和功能：\n\n```\n// 在这里粘贴你的代码\n```",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    label: "优化代码",
    prompt:
      "请帮我优化以下代码，提升性能和可读性：\n\n```\n// 在这里粘贴你的代码\n```",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Bug,
    label: "调试代码",
    prompt:
      "我的代码运行出错了，请帮我找出问题并修复：\n\n```\n// 在这里粘贴你的代码\n```\n\n报错信息：",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: BookOpen,
    label: "学习概念",
    prompt: "请用简单易懂的方式解释以下编程概念：",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Lightbulb,
    label: "写一个函数",
    prompt:
      "请帮我写一个函数，功能要求如下：\n\n- 语言：\n- 功能描述：\n- 输入参数：\n- 返回值：",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: GraduationCap,
    label: "推荐学习路线",
    prompt: "我想学习以下技术，请帮我制定一个学习路线图：",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

/* ------------------------------------------------------------------ */
/*  Markdown 处理工具                                                   */
/* ------------------------------------------------------------------ */

/** 清除 markdown 格式（代码块之外的文本） */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/*  代码块复制按钮                                                      */
/* ------------------------------------------------------------------ */

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 z-10 rounded-md bg-muted-foreground/20 p-1.5 transition-colors hover:bg-muted-foreground/40"
      title="复制代码"
    >
      {copied ? (
        <Check className="size-4 text-green-400" />
      ) : (
        <Copy className="size-4 text-gray-300" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  可折叠代码块（与 Post.tsx 同款）                                     */
/* ------------------------------------------------------------------ */

const CODE_COLLAPSE_THRESHOLD = 10;

function CollapsibleCodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const lineCount = code.split("\n").length;
  const shouldCollapse = lineCount > CODE_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!shouldCollapse);

  return (
    <div className="relative my-2">
      <div className="flex items-center justify-between rounded-t-xl bg-[#282c34] px-4 py-1.5 text-xs text-gray-400">
        <span>
          {language.toUpperCase()} · {lineCount} 行
        </span>
        {shouldCollapse && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 transition-colors hover:text-gray-200"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                收起代码
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                展开代码
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative">
        <CopyButton code={code} />
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            !expanded && "max-h-[240px]",
          )}
        >
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            className="!mt-0 !rounded-t-none rounded-b-xl text-sm"
          >
            {code}
          </SyntaxHighlighter>
        </div>
        {!expanded && (
          <div
            onClick={() => setExpanded(true)}
            className="absolute inset-x-0 bottom-0 flex cursor-pointer items-end justify-center rounded-b-xl bg-gradient-to-t from-[#282c34] via-[#282c34]/80 to-transparent pb-2 pt-10 text-xs text-gray-400 transition-colors hover:text-gray-200"
          >
            <span className="flex items-center gap-1">
              <ChevronDown className="size-3.5" />
              点击展开剩余 {lineCount - CODE_COLLAPSE_THRESHOLD} 行
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown 表格解析渲染                                               */
/* ------------------------------------------------------------------ */

function parseMarkdownTable(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

  const headers = parseRow(lines[0]);
  // 第二行是分隔符 |---|---|，跳过
  const isSeparator = (line: string) => /^\|?[\s\-:|]+\|?$/.test(line);
  if (!isSeparator(lines[1])) return null;

  const rows = lines.slice(2).map(parseRow);

  return { headers, rows };
}

// 在 parseMarkdownTable 函数后面添加这个函数

/** 渲染表格单元格内容：`code` 去掉反引号，**bold** 加粗，其余 markdown 清除 */
function renderCell(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return (
        <span key={i} className="font-semibold text-foreground">
          {boldMatch[1]}
        </span>
      );
    }
    const codeMatch = part.match(/^`(.+)`$/);
    if (codeMatch) {
      return <span key={i}>{codeMatch[1]}</span>;
    }
    return (
      <span key={i}>
        {part
          .replace(/~~(.+?)~~/g, "$1")
          .replace(/\*(.+?)\*/g, "$1")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}
      </span>
    );
  });
}

function MarkdownTable({ raw }: { raw: string }) {
  const table = parseMarkdownTable(raw);
  if (!table) return <span className="whitespace-pre-line">{raw}</span>;

  return (
    <div className="my-2 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {table.headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-xs font-semibold text-foreground"
              >
                {renderCell(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-3 py-2 text-xs text-muted-foreground"
                >
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  消息内容渲染（代码块高亮 + 其他文本 strip markdown）                  */
/* ------------------------------------------------------------------ */

function renderMessageContent(content: string) {
  const parts = content.split(/(```\w*\n[\s\S]*?```)/);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          const language = codeMatch[1] || "text";
          const code = codeMatch[2].trimEnd();
          return (
            <CollapsibleCodeBlock key={i} language={language} code={code} />
          );
        }

        // 把文本按表格块拆分
        const segments = part.split(
          /(\n?\|[^\n]+\|\n\|[\s\-:|]+\|\n(?:\|[^\n]+\|\n?)+)/,
        );

        return (
          <div key={i} className="space-y-2">
            {segments.map((seg, j) => {
              // 判断是否是表格
              if (/^\n?\|.+\|\n\|[\s\-:|]+\|/m.test(seg)) {
                return <MarkdownTable key={j} raw={seg.trim()} />;
              }
              const cleaned = stripMarkdown(seg);
              return cleaned ? (
                <div
                  key={j}
                  className="text-sm leading-relaxed whitespace-pre-line break-words"
                >
                  {cleaned}
                </div>
              ) : null;
            })}
          </div>
        );
      })}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  主组件                                                             */
/* ------------------------------------------------------------------ */

export default function AiAssistant() {
  // 对话状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // 侧边栏状态
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ------ 自动滚动到底部 ------ */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ------ 加载对话列表 ------ */
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-chat");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      console.error("加载对话列表失败");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* ------ 加载对话详情 ------ */
  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-chat?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages);
      }
    } catch {
      console.error("加载对话失败");
    }
  };

  /* ------ 发送消息 ------ */
  const handleSend = async (content?: string) => {
    const text = content || input.trim();
    if (!text || isLoading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `抱歉，出现了错误：${err.error || "未知错误"}`,
          createAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
        return;
      }

      const data = await res.json();

      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        createAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      loadConversations();
    } catch {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "网络错误，请检查连接后重试。",
        createAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------ 新建对话 ------ */
  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  /* ------ 删除对话 ------ */
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ai-chat?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) {
          handleNewChat();
        }
      }
    } catch {
      console.error("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  /* ------ 使用模板 ------ */

  const handleUseTemplate = (prompt: string) => {
    setInput(prompt);
    // 等 React 渲染完成后再计算高度
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          Math.min(textareaRef.current.scrollHeight, 160) + "px";
        textareaRef.current.focus();
      }
    }, 0);
  };

  /* ------ 输入框自动高度 ------ */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  /* ------ 键盘事件 ------ */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ---------------------------------------------------------------- */
  /*  渲染                                                             */
  /* ---------------------------------------------------------------- */

  const isEmptyChat = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0">
      {/* ====== 左侧：对话区 ====== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 对话头部 */}
        <div className="flex h-12 items-center justify-between rounded-t-xl border bg-card px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">小码 AI 助手</h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleNewChat}
            >
              <Plus className="h-3.5 w-3.5" />
              新对话
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="min-h-0 flex-1 overflow-y-auto border-x bg-background">
          {isEmptyChat ? (
            <div className="flex h-full flex-col items-center justify-center px-6">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold">
                你好，有什么我能帮你的吗？
              </h3>
              <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
                我是小码，CodeHub 的 AI
                编程助手。你可以问我编程问题、让我分析代码、解释概念，或者帮你调试
                Bug。
              </p>

              <div className="grid w-full max-w-lg grid-cols-2 gap-2">
                {PRESET_TEMPLATES.slice(0, 4).map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => handleUseTemplate(tpl.prompt)}
                    className="flex items-center gap-2.5 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
                  >
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${tpl.bg}`}
                    >
                      <tpl.icon className={`h-4 w-4 ${tpl.color}`} />
                    </div>
                    <span className="text-xs font-medium">{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 rounded-xl p-3 ${
                    msg.role === "user" ? "bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/10">
                    {msg.role === "user" ? (
                      <User className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    {msg.role === "assistant" ? (
                      renderMessageContent(msg.content)
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 rounded-xl bg-card p-3">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="rounded-b-xl border bg-card p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题... (Shift+Enter 换行)"
              rows={1}
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              style={{ maxHeight: 160 }}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 flex-none rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            小码由豆包大模型驱动，回答仅供参考
          </p>
        </div>
      </div>

      {/* ====== 右侧：功能面板 ====== */}
      <div
        className={`flex-none border-l-0 transition-all duration-200 ${
          sidebarOpen ? "w-64 lg:w-72" : "w-0 overflow-hidden"
        } hidden md:block`}
      >
        <div className="flex h-full w-64 flex-col gap-0 pl-2 lg:w-72">
          {/* 预设模板 */}
          <div className="rounded-t-xl border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              快速提问
            </h3>
            <div className="space-y-1.5">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => handleUseTemplate(tpl.prompt)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                >
                  <div
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-md ${tpl.bg}`}
                  >
                    <tpl.icon className={`h-3 w-3 ${tpl.color}`} />
                  </div>
                  <span className="text-xs font-medium">{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 历史对话 */}
          <div className="flex min-h-0 flex-1 flex-col rounded-b-xl border border-t-0 bg-card">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h3 className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                历史对话
              </h3>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                  暂无对话记录
                </p>
              ) : (
                <div className="space-y-0.5">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent ${
                        conversationId === conv.id ? "bg-accent" : ""
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.updateAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                          {" · "}
                          {conv._count.messages} 条消息
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="hidden flex-none rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                        title="删除对话"
                      >
                        {deletingId === conv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
