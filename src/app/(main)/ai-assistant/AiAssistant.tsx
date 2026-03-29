"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
  Star,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  PanelRightClose,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

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
/*  思考动画 Logo（纯 SVG 米字 sparkle）                                 */
/* ------------------------------------------------------------------ */

function ThinkingLogo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="thinking-logo">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={20 + 6 * Math.cos(rad)}
            y1={20 + 6 * Math.sin(rad)}
            x2={20 + 16 * Math.cos(rad)}
            y2={20 + 16 * Math.sin(rad)}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="thinking-ray"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        );
      })}
      <circle cx="20" cy="20" r="3" fill="currentColor" className="thinking-center" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  思考区块                                                            */
/* ------------------------------------------------------------------ */

function ThinkingBlock() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="thinking-toggle"
      >
        <ThinkingLogo size={18} />
        <span className="thinking-label">正在思考</span>
        <span className="thinking-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-1.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          正在分析你的问题，组织最佳回答方案...
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  代码块复制按钮                                                      */
/* ------------------------------------------------------------------ */

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute right-2 top-2 z-10 rounded-md bg-white/10 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-white/20 hover:text-gray-200"
    >
      {copied ? "已复制 ✓" : "复制"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  可折叠代码块                                                        */
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
    <div className="relative my-3 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between bg-[#282c34] px-4 py-1.5 text-xs text-gray-400">
        <span>{language.toUpperCase()} · {lineCount} 行</span>
        {shouldCollapse && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="transition-colors hover:text-gray-200"
          >
            {expanded ? "▲ 收起" : "▼ 展开"}
          </button>
        )}
      </div>
      <div className="relative">
        <CopyButton code={code} />
        <div className={cn("overflow-hidden transition-all duration-300", !expanded && "max-h-[240px]")}>
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            className="!my-0 !rounded-t-none text-sm"
          >
            {code}
          </SyntaxHighlighter>
        </div>
        {!expanded && (
          <div
            onClick={() => setExpanded(true)}
            className="absolute inset-x-0 bottom-0 flex cursor-pointer items-end justify-center bg-gradient-to-t from-[#282c34] to-transparent pb-2 pt-10 text-xs text-gray-400 hover:text-gray-200"
          >
            ▼ 展开剩余 {lineCount - CODE_COLLAPSE_THRESHOLD} 行
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown 渲染（支持代码块、行内代码、表格、公式占位）                    */
/* ------------------------------------------------------------------ */

function renderInlineMarkdown(text: string) {
  // 处理行内代码、加粗、斜体、链接
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\([^)]+\))/g);

  return parts.map((part, i) => {
    if (!part) return null;

    // 行内代码
    const codeMatch = part.match(/^`(.+)`$/);
    if (codeMatch) {
      return (
        <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-primary">
          {codeMatch[1]}
        </code>
      );
    }

    // 加粗
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return <strong key={i} className="font-semibold">{boldMatch[1]}</strong>;
    }

    // 斜体
    const italicMatch = part.match(/^\*(.+)\*$/);
    if (italicMatch) {
      return <em key={i}>{italicMatch[1]}</em>;
    }

    return <span key={i}>{part}</span>;
  });
}

function parseMarkdownTable(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null;
  const parseRow = (line: string) => line.split("|").map((c) => c.trim()).filter(Boolean);
  const headers = parseRow(lines[0]);
  if (!/^\|?[\s\-:|]+\|?$/.test(lines[1])) return null;
  const rows = lines.slice(2).map(parseRow);
  return { headers, rows };
}

function MarkdownTable({ raw }: { raw: string }) {
  const table = parseMarkdownTable(raw);
  if (!table) return <span className="whitespace-pre-line">{raw}</span>;

  return (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {table.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-semibold">
                {renderInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-xs text-muted-foreground">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMessageContent(content: string) {
  const parts = content.split(/(```\w*\n[\s\S]*?```)/);

  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        // 代码块
        const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          return <CollapsibleCodeBlock key={i} language={codeMatch[1] || "text"} code={codeMatch[2].trimEnd()} />;
        }

        // 表格
        const segments = part.split(/(\n?\|[^\n]+\|\n\|[\s\-:|]+\|\n(?:\|[^\n]+\|\n?)+)/);

        return (
          <div key={i} className="space-y-1">
            {segments.map((seg, j) => {
              if (/^\n?\|.+\|\n\|[\s\-:|]+\|/m.test(seg)) {
                return <MarkdownTable key={j} raw={seg.trim()} />;
              }

              // 处理普通文本（保留 markdown 格式渲染）
              const lines = seg.split("\n");
              const rendered: React.ReactNode[] = [];
              let currentParagraph: string[] = [];

              const flushParagraph = () => {
                if (currentParagraph.length > 0) {
                  const text = currentParagraph.join("\n");
                  rendered.push(
                    <p key={rendered.length} className="text-sm leading-7">
                      {renderInlineMarkdown(text)}
                    </p>,
                  );
                  currentParagraph = [];
                }
              };

              lines.forEach((line) => {
                const trimmed = line.trimStart();

                // 标题
                const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
                if (headingMatch) {
                  flushParagraph();
                  const level = headingMatch[1].length;
                  const sizes = ["text-lg font-bold", "text-base font-bold", "text-sm font-semibold", "text-sm font-medium"];
                  rendered.push(
                    <div key={rendered.length} className={cn("mt-4 mb-2", sizes[level - 1] || sizes[3])}>
                      {renderInlineMarkdown(headingMatch[2])}
                    </div>,
                  );
                  return;
                }

                // 列表
                if (/^[-*+]\s+/.test(trimmed)) {
                  flushParagraph();
                  rendered.push(
                    <div key={rendered.length} className="flex gap-2 text-sm leading-7">
                      <span className="text-muted-foreground">•</span>
                      <span>{renderInlineMarkdown(trimmed.replace(/^[-*+]\s+/, ""))}</span>
                    </div>,
                  );
                  return;
                }

                // 有序列表
                const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
                if (olMatch) {
                  flushParagraph();
                  rendered.push(
                    <div key={rendered.length} className="flex gap-2 text-sm leading-7">
                      <span className="text-muted-foreground">{olMatch[1]}.</span>
                      <span>{renderInlineMarkdown(olMatch[2])}</span>
                    </div>,
                  );
                  return;
                }

                // 引用
                if (trimmed.startsWith("> ")) {
                  flushParagraph();
                  rendered.push(
                    <blockquote key={rendered.length} className="my-2 border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
                      {renderInlineMarkdown(trimmed.slice(2))}
                    </blockquote>,
                  );
                  return;
                }

                // 分隔线
                if (/^---+$/.test(trimmed)) {
                  flushParagraph();
                  rendered.push(<hr key={rendered.length} className="my-3 border-border" />);
                  return;
                }

                // 空行
                if (trimmed === "") {
                  flushParagraph();
                  return;
                }

                currentParagraph.push(line);
              });

              flushParagraph();

              return rendered.length > 0 ? <div key={j}>{rendered}</div> : null;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-chat");
      if (res.ok) setConversations(await res.json());
    } catch { console.error("加载对话列表失败"); }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-chat-starred");
      if (saved) setStarredIds(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("ai-chat-starred", JSON.stringify([...next]));
      return next;
    });
  };

  const filteredConversations = conversations.filter((c) =>
    searchQuery ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true,
  );
  const starredConversations = filteredConversations.filter((c) => starredIds.has(c.id));
  const recentConversations = filteredConversations.filter((c) => !starredIds.has(c.id));

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-chat?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages);
      }
    } catch { console.error("加载对话失败"); }
  };

  const handleSend = async (content?: string) => {
    const text = content || input.trim();
    if (!text || isLoading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: `temp-${Date.now()}`, role: "user", content: text, createAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: `抱歉，出现了错误：${err.error || "未知错误"}`, createAt: new Date().toISOString() }]);
        return;
      }

      const data = await res.json();
      if (!conversationId) setConversationId(data.conversationId);

      const aiMsgId = `ai-${Date.now()}`;
      setMessages((prev) => [...prev, { id: aiMsgId, role: "assistant", content: data.reply, createAt: new Date().toISOString() }]);
      loadConversations();
    } catch {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "网络错误，请检查连接后重试。", createAt: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ai-chat?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) handleNewChat();
      }
    } catch { console.error("删除失败"); }
    finally { setDeletingId(null); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isEmptyChat = messages.length === 0;

  const renderConvItem = (conv: Conversation) => (
    <div
      key={conv.id}
      onClick={() => loadConversation(conv.id)}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent",
        conversationId === conv.id && "bg-accent",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">{conv.title}</p>
      </div>
      <div className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => toggleStar(conv.id, e)}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-amber-500"
          title={starredIds.has(conv.id) ? "取消收藏" : "收藏"}
        >
          <Star className={cn("h-3 w-3", starredIds.has(conv.id) && "fill-amber-500 text-amber-500")} />
        </button>
        <button
          onClick={(e) => handleDelete(conv.id, e)}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
          title="删除对话"
        >
          {deletingId === conv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .thinking-logo {
          color: hsl(var(--primary));
          animation: thinking-spin 3s linear infinite;
        }
        @keyframes thinking-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .thinking-ray {
          opacity:.5;
          animation: ray-pulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes ray-pulse { 0%{opacity:.3} 100%{opacity:1} }
        .thinking-center { animation: center-pulse 1.5s ease-in-out infinite; }
        @keyframes center-pulse { 0%,100%{r:3} 50%{r:4} }
        .thinking-toggle {
          display:flex; align-items:center; gap:8px;
          padding:8px 12px; border-radius:10px;
          background:hsl(var(--primary)/.06);
          border:1px solid hsl(var(--primary)/.12);
          cursor:pointer; transition:background .2s;
          width:auto; text-align:left;
        }
        .thinking-toggle:hover { background:hsl(var(--primary)/.1); }
        .thinking-label { font-size:13px; color:hsl(var(--primary)); font-weight:500; }
        .thinking-dots { display:flex; gap:3px; align-items:center; }
        .thinking-dots .dot {
          width:4px; height:4px; border-radius:50%;
          background:hsl(var(--primary)/.5);
          animation:dot-bounce 1.2s ease-in-out infinite;
        }
        .thinking-dots .dot:nth-child(2){animation-delay:.15s}
        .thinking-dots .dot:nth-child(3){animation-delay:.3s}
        @keyframes dot-bounce {
          0%,60%,100%{transform:translateY(0);opacity:.4}
          30%{transform:translateY(-4px);opacity:1}
        }
        .typewriter-cursor {
          display:inline-block; width:2px; height:1em;
          background:hsl(var(--primary)); margin-left:1px;
          vertical-align:text-bottom;
          animation:blink .8s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .welcome-sparkle {
          color:hsl(var(--primary));
          animation:sparkle-rotate 6s linear infinite;
        }
        @keyframes sparkle-rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .sidebar-section-label {
          font-size:11px; font-weight:600;
          color:hsl(var(--muted-foreground));
          padding:12px 14px 6px;
          letter-spacing:.02em;
        }
        /* Claude 风格用户气泡 */
        .user-bubble {
          background: hsl(var(--primary)/.08);
          border-radius: 18px;
          padding: 10px 16px;
          font-size: 14px;
          line-height: 1.6;
          max-width: 85%;
          word-break: break-word;
          white-space: pre-wrap;
        }
        /* 艺术字 logo */
        .logo-art {
          font-family: 'Georgia', 'Times New Roman', 'Noto Serif SC', serif;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/.7));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-xl border">
        {/* ====== 主聊天区（左侧） ====== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 顶栏 */}
          <div className="flex h-12 flex-none items-center justify-between border-b bg-white px-4 dark:bg-card">
            <div className="flex items-center gap-3">
              <span className="logo-art">Claude Code</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                新对话
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={sidebarOpen ? "收起历史" : "展开历史"}
              >
                {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 消息区 - 白色背景 */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-background">
            {isEmptyChat ? (
              <div className="flex h-full flex-col items-center justify-center px-6">
                <div className="mb-4 flex items-center gap-3">
                  <svg viewBox="0 0 40 40" width={32} height={32} className="welcome-sparkle">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180;
                      return (
                        <line key={i} x1={20 + 6 * Math.cos(rad)} y1={20 + 6 * Math.sin(rad)} x2={20 + 16 * Math.cos(rad)} y2={20 + 16 * Math.sin(rad)} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      );
                    })}
                    <circle cx="20" cy="20" r="3" fill="currentColor" />
                  </svg>
                  <h2 className="text-2xl font-semibold tracking-tight">你好，有什么可以帮你？</h2>
                </div>
                <p className="mb-10 max-w-md text-center text-sm text-muted-foreground">
                  我是 Claude Code，你的 AI 编程助手。你可以问我编程问题、让我分析代码、解释概念，或者帮你调试 Bug。
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { label: "解释代码", prompt: "请帮我解释以下代码的逻辑和功能：\n\n```\n// 在这里粘贴你的代码\n```" },
                    { label: "调试 Bug", prompt: "我的代码运行出错了，请帮我找出问题并修复：\n\n```\n// 在这里粘贴你的代码\n```\n\n报错信息：" },
                    { label: "学习概念", prompt: "请用简单易懂的方式解释以下编程概念：" },
                    { label: "优化代码", prompt: "请帮我优化以下代码，提升性能和可读性：\n\n```\n// 在这里粘贴你的代码\n```" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setInput(item.prompt);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.style.height = "auto";
                            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
                            textareaRef.current.focus();
                          }
                        }, 0);
                      }}
                      className="rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl px-4 py-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="mb-6">
                    {msg.role === "user" ? (
                      /* 用户消息：左对齐气泡，无头像 */
                      <div className="flex">
                        <div className="user-bubble">{msg.content}</div>
                      </div>
                    ) : (
                      /* AI 回答：段落式，无头像，直接展示 */
                      <div className="mt-1">
                        {renderMessageContent(msg.content)}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="mb-6">
                    <ThinkingBlock />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="flex-none border-t bg-white px-4 py-3 dark:bg-card">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-shadow focus-within:shadow-md dark:bg-card">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的问题..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  style={{ maxHeight: 160 }}
                />
                {/* Claude 同款发送按钮：圆形 + ArrowUp */}
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "flex h-8 w-8 flex-none items-center justify-center rounded-full transition-all",
                    input.trim() && !isLoading
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Claude Code 由豆包大模型驱动，回答仅供参考
              </p>
            </div>
          </div>
        </div>

        {/* ====== 右侧历史栏 ====== */}
        {sidebarOpen && (
          <div className="flex w-64 flex-none flex-col border-l bg-card lg:w-72">
            {/* 顶部 */}
            <div className="flex items-center justify-between border-b px-3 py-3">
              <span className="text-sm font-semibold">历史对话</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setSearchOpen(!searchOpen);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="搜索"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 搜索 */}
            {searchOpen && (
              <div className="border-b px-3 py-2">
                <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索对话..."
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 列表 */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="px-4 py-12 text-center text-xs text-muted-foreground">
                  {searchQuery ? "未找到匹配的对话" : "暂无对话记录"}
                </p>
              ) : (
                <>
                  {starredConversations.length > 0 && (
                    <>
                      <div className="sidebar-section-label">已收藏</div>
                      <div className="space-y-0.5 px-2">{starredConversations.map(renderConvItem)}</div>
                    </>
                  )}
                  {recentConversations.length > 0 && (
                    <>
                      <div className="sidebar-section-label">{starredConversations.length > 0 ? "最近" : "对话记录"}</div>
                      <div className="space-y-0.5 px-2">{recentConversations.map(renderConvItem)}</div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="border-t px-3 py-2.5">
              <p className="text-center text-[10px] text-muted-foreground">Claude Code · 豆包大模型驱动</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}