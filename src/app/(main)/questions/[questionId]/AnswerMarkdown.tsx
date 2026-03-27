"use client";

import { useEffect, useState, useCallback } from "react";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import katex from "katex";
import "katex/dist/katex.min.css";
import { codeToHtml } from "shiki";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ── 常量 ──
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

// ── KaTeX 公式渲染 ──
function renderMath(src: string): string {
  src = src.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<pre>${math}</pre>`;
    }
  });
  src = src.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${math}</code>`;
    }
  });
  return src;
}

// ── markdown-it 实例（代码块输出占位符，后续用 React 组件替换）──
const PLACEHOLDER_PREFIX = "___CODEBLOCK_";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    // 输出一个带特殊标记的占位 div，后续会被拆分成 React 组件
    const escaped = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `${PLACEHOLDER_PREFIX}${lang || "text"}${PLACEHOLDER_PREFIX}${escaped}${PLACEHOLDER_PREFIX}END${PLACEHOLDER_PREFIX}`;
  },
}).use(taskLists, { enabled: false, label: true });

// ── 可交互的代码块组件 ──
function InteractiveCodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const lineCount = code.split("\n").length;
  const shouldCollapse = lineCount > CODE_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!shouldCollapse);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // 异步高亮
  useEffect(() => {
    const normalizedLang = normalizeLang(language.toLowerCase());
    if (SUPPORTED_LANGS.has(language.toLowerCase()) || SUPPORTED_LANGS.has(normalizedLang)) {
      codeToHtml(code, {
        lang: normalizedLang,
        themes: { light: "github-light", dark: "github-dark" },
      })
        .then(setHighlightedHtml)
        .catch(() => setHighlightedHtml(null));
    }
  }, [code, language]);

  return (
    <div className="qa-code-interactive group relative my-3 overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
      {/* 顶栏：语言 + 行数 + 展开/收起 + 复制 */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-1.5 text-[12px] text-[hsl(var(--muted-foreground))]">
        <span className="font-semibold uppercase tracking-wider">
          {language.toUpperCase()}{" "}
          <span className="font-normal normal-case">· {lineCount} 行</span>
        </span>
        <div className="flex items-center gap-2">
          {shouldCollapse && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3.5" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  展开
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
                <Check className="size-3.5 text-green-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                复制
              </>
            )}
          </button>
        </div>
      </div>

      {/* 代码内容 */}
      <div className="relative">
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            !expanded && `max-h-[${CODE_COLLAPSE_THRESHOLD * 1.65 * 13 + 32}px]`,
          )}
          style={!expanded ? { maxHeight: CODE_COLLAPSE_THRESHOLD * 1.65 * 13 + 32 } : undefined}
        >
          {highlightedHtml ? (
            <div
              className="qa-code-shiki"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="p-4 text-[13px] leading-[1.65] font-mono">
              <code>{code}</code>
            </pre>
          )}
        </div>

        {/* 渐变遮罩 + 点击展开 */}
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
      </div>
    </div>
  );
}

// ── 主组件 ──
interface AnswerMarkdownProps {
  content: string;
}

export default function AnswerMarkdown({ content }: AnswerMarkdownProps) {
  const [nonCodeHtmlParts, setNonCodeHtmlParts] = useState<string[]>([]);
  const [codeBlocks, setCodeBlocks] = useState<Array<{ lang: string; code: string }>>([]);

  useEffect(() => {
    if (!content) {
      setNonCodeHtmlParts([]);
      setCodeBlocks([]);
      return;
    }

    const withMath = renderMath(content);
    const rendered = md.render(withMath);

    // 用占位符拆分 HTML：交替排列 [html, codeBlock, html, codeBlock, ...]
    const placeholderRegex = new RegExp(
      `${PLACEHOLDER_PREFIX}(.*?)${PLACEHOLDER_PREFIX}([\\s\\S]*?)${PLACEHOLDER_PREFIX}END${PLACEHOLDER_PREFIX}`,
      "g",
    );

    const blocks: Array<{ lang: string; code: string }> = [];
    const htmlParts: string[] = [];
    let lastIndex = 0;

    let match;
    while ((match = placeholderRegex.exec(rendered)) !== null) {
      // match 前面的 HTML
      htmlParts.push(rendered.slice(lastIndex, match.index));
      // 代码块
      const lang = match[1] || "text";
      const code = match[2]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      blocks.push({ lang, code });
      lastIndex = match.index + match[0].length;
    }
    // 最后一段 HTML
    htmlParts.push(rendered.slice(lastIndex));

    setNonCodeHtmlParts(htmlParts);
    setCodeBlocks(blocks);
  }, [content]);

  if (!content) return null;

  // 交替渲染：HTML 部分 + React 代码块组件
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < nonCodeHtmlParts.length; i++) {
    if (nonCodeHtmlParts[i]) {
      elements.push(
        <div
          key={`html-${i}`}
          className="qa-markdown"
          dangerouslySetInnerHTML={{ __html: nonCodeHtmlParts[i] }}
        />,
      );
    }
    if (i < codeBlocks.length) {
      elements.push(
        <InteractiveCodeBlock
          key={`code-${i}`}
          language={codeBlocks[i].lang}
          code={codeBlocks[i].code}
        />,
      );
    }
  }

  return (
    <>
      <style jsx global>{`
        .qa-markdown {
          font-size: 15px;
          line-height: 1.8;
          color: hsl(var(--foreground) / 0.9);
          word-wrap: break-word;
        }
        .qa-markdown h1 {
          font-size: 1.4em; font-weight: 700; margin: 1.2em 0 0.6em;
          padding-bottom: 0.2em; border-bottom: 1px solid hsl(var(--border));
        }
        .qa-markdown h2 { font-size: 1.2em; font-weight: 700; margin: 1.1em 0 0.5em; }
        .qa-markdown h3 { font-size: 1.05em; font-weight: 600; margin: 1em 0 0.4em; }
        .qa-markdown p { margin: 0.5em 0; }
        .qa-markdown strong { font-weight: 700; }
        .qa-markdown em { font-style: italic; }
        .qa-markdown a { color: hsl(var(--primary)); text-decoration: none; }
        .qa-markdown a:hover { text-decoration: underline; }
        .qa-markdown code:not(pre code) {
          background: hsl(var(--muted)); color: hsl(var(--primary));
          padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.88em;
          font-family: ui-monospace, "Cascadia Code", "Fira Code", monospace; font-weight: 500;
        }
        .qa-markdown blockquote {
          margin: 0.6em 0; padding: 0.4em 1em;
          border-left: 3px solid hsl(var(--border)); color: hsl(var(--muted-foreground));
        }
        .qa-markdown blockquote p { margin: 0.2em 0; }
        .qa-markdown ul, .qa-markdown ol { margin: 0.4em 0; padding-left: 1.6em; }
        .qa-markdown li { margin: 0.2em 0; }
        .qa-markdown ul { list-style: disc; }
        .qa-markdown ol { list-style: decimal; }
        .qa-markdown hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.2em 0; }
        .qa-markdown img { max-width: 100%; border-radius: 8px; margin: 0.6em 0; }
        .qa-markdown table {
          width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 13px;
          border: 1px solid hsl(var(--border)); border-radius: 8px; overflow: hidden;
        }
        .qa-markdown thead { background: hsl(var(--muted) / 0.5); }
        .qa-markdown th { padding: 6px 12px; text-align: left; font-weight: 600; font-size: 12px; border-bottom: 2px solid hsl(var(--border)); }
        .qa-markdown td { padding: 6px 12px; border-bottom: 1px solid hsl(var(--border) / 0.5); }
        .qa-markdown del { text-decoration: line-through; color: hsl(var(--muted-foreground)); }
        .qa-markdown .task-list-item { list-style: none; position: relative; }
        .qa-markdown .task-list-item-checkbox { margin: 0 0.5em 0 -1.4em; accent-color: hsl(var(--primary)); }
        .qa-markdown .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
        .qa-markdown .katex { font-size: 1.1em; }

        /* 代码块内 shiki 样式 */
        .qa-code-shiki .shiki {
          margin: 0; padding: 1em 1.2em; overflow-x: auto;
          font-size: 13px; line-height: 1.65;
          font-family: ui-monospace, "Cascadia Code", "Fira Code", monospace;
          border-radius: 0; background: transparent !important;
        }
        .qa-code-shiki .shiki code {
          background: none !important; padding: 0; font-size: inherit;
        }
        html.dark .qa-code-shiki .shiki,
        html.dark .qa-code-shiki .shiki span {
          color: var(--shiki-dark) !important;
          background-color: transparent !important;
        }
      `}</style>
      <div>{elements}</div>
    </>
  );
}