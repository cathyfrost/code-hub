"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { codeToHtml } from "shiki";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineCommentData } from "@/lib/types";
import InlineCommentThread from "./InlineCommentThread";

const CODE_COLLAPSE_THRESHOLD = 10;

const SUPPORTED_LANGS = new Set([
  "javascript", "js", "typescript", "ts", "python", "py",
  "bash", "sh", "shell", "sql", "java", "cpp", "c", "c++",
  "go", "rust", "json", "css", "html", "xml",
]);

function normalizeLang(lang: string): string {
  const map: Record<string, string> = {
    js: "javascript", ts: "typescript", py: "python",
    sh: "bash", shell: "bash", "c++": "cpp", c: "cpp", xml: "html",
  };
  return map[lang] || lang;
}

interface Props {
  language: string;
  code: string;
  postId: string;
  codeBlockIndex: number;
  inlineComments: InlineCommentData[];
  onCommentAdded: (comment: InlineCommentData) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export default function InlineCodeBlockWithComments({
  language,
  code,
  postId,
  codeBlockIndex,
  inlineComments,
  onCommentAdded,
  onCommentDeleted,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  const lines = code.split("\n");
  const lineCount = lines.length;
  const shouldCollapse = lineCount > CODE_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!shouldCollapse);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  
  // 核心：分离“控制打开的行号”和“动画渲染的行号”
  const [openThreadLine, setOpenThreadLine] = useState<number | null>(null);
  const [animatingLine, setAnimatingLine] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 修复问题2：忽略弹窗和下拉菜单的点击事件，防止误触发收起
  useEffect(() => {
    if (openThreadLine === null) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element;
      
      // 如果点击的是 Shadcn(Radix UI) 弹窗、菜单等 Portal 元素，直接忽略
      if (
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-state="open"]')
      ) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpenThreadLine(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openThreadLine]);

  // 修复问题3：监听 openThreadLine 的变化，处理收起时的延迟卸载
  useEffect(() => {
    if (openThreadLine !== null) {
      setAnimatingLine(openThreadLine);
    } else {
      // 收起时，给 300ms 播放动画，然后再将内容置空
      const timer = setTimeout(() => setAnimatingLine(null), 300);
      return () => clearTimeout(timer);
    }
  }, [openThreadLine]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  useEffect(() => {
    const normalizedLang = normalizeLang(language.toLowerCase());
    if (
      SUPPORTED_LANGS.has(language.toLowerCase()) ||
      SUPPORTED_LANGS.has(normalizedLang)
    ) {
      Promise.all(
        lines.map((line) =>
          codeToHtml(line || " ", {
            lang: normalizedLang,
            themes: { light: "github-light", dark: "github-dark" },
          }),
        ),
      )
        .then(setHighlightedLines)
        .catch(() => setHighlightedLines([]));
    }
  }, [code, language]);

  function getCommentsForLine(lineNum: number) {
    return inlineComments.filter((c) => c.lineNumber === lineNum);
  }

  const commentedLines = new Map<number, number>();
  for (const c of inlineComments) {
    commentedLines.set(
      c.lineNumber,
      (commentedLines.get(c.lineNumber) || 0) + 1,
    );
  }

  const visibleLineCount = expanded
    ? lineCount
    : Math.min(lineCount, CODE_COLLAPSE_THRESHOLD);

  const isThreadVisible = openThreadLine !== null;
  const displayLine = openThreadLine ?? animatingLine;

  return (
    <div
      ref={containerRef}
      className="qa-code-interactive group relative my-3 overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]"
    >
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-1.5 text-[12px] text-[hsl(var(--muted-foreground))]">
        <span className="font-semibold uppercase tracking-wider">
          {language.toUpperCase()}{" "}
          <span className="font-normal normal-case">· {lineCount} 行</span>
          {inlineComments.length > 0 && (
            <span className="ml-2 font-normal normal-case text-green-500">
              · {inlineComments.length} 条批注
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {shouldCollapse && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3.5" /> 收起
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" /> 展开
                </>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 transition-colors hover:text-[hsl(var(--foreground))]"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-green-500" /> 已复制
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> 复制
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px] leading-[1.65]">
          <tbody>
            {lines.slice(0, visibleLineCount).map((line, idx) => {
              const lineNum = idx + 1;
              const lineComments = getCommentsForLine(lineNum);
              const hasComments = lineComments.length > 0;
              const isHovered = hoveredLine === lineNum;
              const isThreadOpen = openThreadLine === lineNum;

              return (
                <tr key={lineNum} className="group/line">
                  <td
                    className={cn(
                      "select-none whitespace-nowrap border-r border-[hsl(var(--border)/0.3)] px-3 text-right text-[12px] text-[hsl(var(--muted-foreground)/0.5)] align-top",
                      hasComments && "bg-yellow-500/5",
                    )}
                    style={{ width: "1%" }}
                    onMouseEnter={() => setHoveredLine(lineNum)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isHovered && !hasComments && (
                        <button
                          onClick={() =>
                            setOpenThreadLine(isThreadOpen ? null : lineNum)
                          }
                          className="text-green-500 opacity-0 transition-opacity group-hover/line:opacity-100"
                        >
                          <MessageSquarePlus className="size-3.5" />
                        </button>
                      )}
                      {hasComments && (
                        <button
                          onClick={() =>
                            setOpenThreadLine(isThreadOpen ? null : lineNum)
                          }
                          className="flex items-center gap-0.5 text-green-500"
                        >
                          <MessageSquare className="size-3" />
                          <span className="text-[10px]">
                            {lineComments.length}
                          </span>
                        </button>
                      )}
                      <span>{lineNum}</span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "whitespace-pre px-4 align-top",
                      hasComments && "bg-yellow-500/5",
                    )}
                    onMouseEnter={() => setHoveredLine(lineNum)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    {highlightedLines[idx] ? (
                      <span
                        className="qa-code-shiki-line"
                        dangerouslySetInnerHTML={{
                          __html: highlightedLines[idx]
                            .replace(/<\/?pre[^>]*>/g, "")
                            .replace(/<\/?code[^>]*>/g, ""),
                        }}
                      />
                    ) : (
                      <span>{line || " "}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 修复问题3：通过 CSS Grid 1fr 实现手风琴动画 */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isThreadVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {displayLine !== null && (
            <InlineCommentThread
              postId={postId}
              codeBlockIndex={codeBlockIndex}
              lineNumber={displayLine}
              comments={getCommentsForLine(displayLine)}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
            />
          )}
        </div>
      </div>

      {!expanded && shouldCollapse && (
        <div
          onClick={() => setExpanded(true)}
          className="absolute inset-x-0 bottom-0 flex cursor-pointer items-end justify-center bg-gradient-to-t from-[hsl(var(--muted)/0.8)] via-[hsl(var(--muted)/0.4)] to-transparent pb-2 pt-10 text-[12px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          <span className="flex items-center gap-1">
            <ChevronDown className="size-3.5" />
            点击展开剩余 {lineCount - CODE_COLLAPSE_THRESHOLD} 行
          </span>
        </div>
      )}

      <style jsx global>{`
        .qa-code-shiki-line .shiki {
          display: inline;
          background: transparent !important;
        }
        .qa-code-shiki-line .shiki code {
          background: none !important;
          padding: 0;
          font-size: inherit;
        }
        html.dark .qa-code-shiki-line .shiki span,
        html.dark .qa-code-shiki-line .shiki {
          color: var(--shiki-dark) !important;
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}