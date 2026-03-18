"use client";

import { useEffect, useState } from "react";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import katex from "katex";
import "katex/dist/katex.min.css";
import { codeToHtml } from "shiki";

const SUPPORTED_LANGS = new Set([
  "javascript",
  "js",
  "typescript",
  "ts",
  "python",
  "py",
  "bash",
  "sh",
  "shell",
  "sql",
  "java",
  "cpp",
  "c",
  "c++",
  "go",
  "rust",
  "json",
  "css",
  "html",
  "xml",
]);

function normalizeLang(lang: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    "c++": "cpp",
    c: "cpp",
    xml: "html",
  };
  return map[lang] || lang;
}

function renderMath(src: string): string {
  // 块级公式 $$...$$
  src = src.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<pre>${math}</pre>`;
    }
  });

  // 行内公式 $...$
  src = src.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code>${math}</code>`;
    }
  });

  return src;
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    // shiki 的 codeToHtml 是异步的，highlight 回调是同步的
    // 所以这里先返回转义后的 HTML，语言标签照常显示
    const escaped = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<div class="code-block-wrapper">${
      lang ? `<div class="code-block-lang">${lang}</div>` : ""
    }<pre><code>${escaped}</code></pre></div>`;
  },
}).use(taskLists, { enabled: false, label: true });

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!content) {
      setHtml("");
      return;
    }

    const withMath = renderMath(content);
    const rendered = md.render(withMath);

    // 异步高亮代码块
    const codeBlockRegex =
      /<div class="code-block-wrapper">(?:<div class="code-block-lang">(\w+)<\/div>)?<pre><code>([\s\S]*?)<\/code><\/pre><\/div>/g;

    const matches = [...rendered.matchAll(codeBlockRegex)];

    if (matches.length === 0) {
      setHtml(rendered);
      return;
    }

    Promise.all(
      matches.map(async (match) => {
        const lang = match[1];
        const code = match[2]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        const normalizedLang = lang ? normalizeLang(lang.toLowerCase()) : "";

        if (normalizedLang && SUPPORTED_LANGS.has(lang?.toLowerCase() || "")) {
          try {
            const highlighted = await codeToHtml(code, {
              lang: normalizedLang,
              themes: { light: "github-light", dark: "github-dark" },
            });
            return {
              original: match[0],
              replacement: `<div class="code-block-wrapper">${lang ? `<div class="code-block-lang">${lang}</div>` : ""}${highlighted}</div>`,
            };
          } catch {
            return null;
          }
        }
        return null;
      }),
    ).then((results) => {
      let final = rendered;
      for (const r of results) {
        if (r) {
          final = final.replace(r.original, r.replacement);
        }
      }
      setHtml(final);
    });
  }, [content]);

  if (!content) {
    return (
      <p className="text-sm italic text-muted-foreground">
        预览区域（开始输入后显示）
      </p>
    );
  }

  return (
    <>
      <style jsx global>{`
        .markdown-body {
          font-size: 14px;
          line-height: 1.8;
          color: hsl(var(--foreground));
          word-wrap: break-word;
        }

        /* ---- 标题 ---- */
        .markdown-body h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 1.5em 0 0.8em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid hsl(var(--border));
        }
        .markdown-body h2 {
          font-size: 1.25em;
          font-weight: 700;
          margin: 1.4em 0 0.6em;
          padding-bottom: 0.25em;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
        }
        .markdown-body h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 1.2em 0 0.5em;
        }
        .markdown-body h4 {
          font-size: 1em;
          font-weight: 600;
          margin: 1em 0 0.4em;
        }

        /* ---- 段落 ---- */
        .markdown-body p {
          margin: 0.5em 0;
        }

        /* ---- 粗体 & 斜体 ---- */
        .markdown-body strong {
          font-weight: 700;
        }
        .markdown-body em {
          font-style: italic;
        }

        /* ---- 链接 ---- */
        .markdown-body a {
          color: hsl(var(--primary));
          text-decoration: none;
        }
        .markdown-body a:hover {
          text-decoration: underline;
        }

        /* ---- 行内代码 ---- */
        .markdown-body code:not(pre code) {
          background: hsl(var(--muted));
          color: hsl(var(--primary));
          padding: 0.2em 0.45em;
          border-radius: 4px;
          font-size: 0.88em;
          font-family: ui-monospace, "Cascadia Code", "Fira Code", monospace;
          font-weight: 500;
        }

        /* ---- 代码块 ---- */
        .markdown-body .code-block-wrapper {
          position: relative;
          margin: 1em 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.3);
        }
        .markdown-body .code-block-lang {
          position: absolute;
          top: 0;
          right: 0;
          padding: 2px 10px;
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / 0.6);
          border-bottom-left-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .markdown-body .code-block-wrapper {
          position: relative;
          margin: 1em 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.3);
        }
        .markdown-body .code-block-lang {
          position: absolute;
          top: 0;
          right: 0;
          padding: 2px 10px;
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / 0.6);
          border-bottom-left-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .markdown-body pre {
          margin: 0;
          padding: 1em 1.2em;
          overflow-x: auto;
          font-size: 13px;
          line-height: 1.65;
          font-family: ui-monospace, "Cascadia Code", "Fira Code", monospace;
        }
        .markdown-body .code-block-wrapper .shiki {
          margin: 0;
          padding: 1em 1.2em;
          overflow-x: auto;
          font-size: 13px;
          line-height: 1.65;
          font-family: ui-monospace, "Cascadia Code", "Fira Code", monospace;
          border-radius: 0;
          background: transparent !important;
        }
        .markdown-body .code-block-wrapper .shiki code {
          background: none !important;
          padding: 0;
          font-size: inherit;
        }
        /* 亮色/暗色主题切换 */
        html.dark .markdown-body .shiki,
        html.dark .markdown-body .shiki span {
          color: var(--shiki-dark) !important;
          background-color: transparent !important;
        }
        .markdown-body pre code {
          background: none !important;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
          font-weight: normal;
        }

        /* ---- 表格 ---- */
        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          font-size: 13px;
          overflow: hidden;
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
        }
        .markdown-body thead {
          background: hsl(var(--muted) / 0.5);
        }
        .markdown-body th {
          padding: 8px 14px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          border-bottom: 2px solid hsl(var(--border));
        }
        .markdown-body td {
          padding: 8px 14px;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
        }
        .markdown-body tbody tr:hover {
          background: hsl(var(--accent) / 0.3);
        }
        .markdown-body tbody tr:last-child td {
          border-bottom: none;
        }

        /* ---- 引用 ---- */
        .markdown-body blockquote {
          margin: 0.8em 0;
          padding: 0.5em 1em;
          border-left: 3px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }
        .markdown-body blockquote p {
          margin: 0.25em 0;
        }

        /* ---- 列表 ---- */
        .markdown-body ul,
        .markdown-body ol {
          margin: 0.5em 0;
          padding-left: 1.8em;
        }
        .markdown-body li {
          margin: 0.25em 0;
        }
        .markdown-body ul {
          list-style: disc;
        }
        .markdown-body ol {
          list-style: decimal;
        }

        /* ---- 任务列表 ---- */
        .markdown-body .task-list-item {
          list-style: none;
          position: relative;
        }
        .markdown-body .task-list-item-checkbox {
          margin: 0 0.5em 0 -1.4em;
          vertical-align: middle;
          accent-color: hsl(var(--primary));
          width: 16px;
          height: 16px;
          border: 2px solid hsl(var(--border));
          border-radius: 3px;
          cursor: default;
        }

        /* ---- 分割线 ---- */
        .markdown-body hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5em 0;
        }

        /* ---- 图片 ---- */
        .markdown-body img {
          max-width: 100%;
          border-radius: 8px;
          margin: 0.8em 0;
        }

        /* ---- 删除线 ---- */
        .markdown-body del {
          text-decoration: line-through;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
