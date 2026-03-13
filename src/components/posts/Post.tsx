"use client";

import { PostData } from "@/lib/types";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useState } from "react";
import { Copy, Check, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "@/app/(main)/SessionProvider";
import PostMoreButton from "./PostMoreButton";
import Linkify from "../Linkify";
import UserTooltip from "../UserTooltip";
import { Media } from "@prisma/client";
import Image from "next/image";

interface PostProps {
  post: PostData;
}

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
      className="absolute right-2 top-2 rounded-md bg-muted-foreground/20 p-1.5 transition-colors hover:bg-muted-foreground/40"
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

function AIAnalyzeButton({ content, imageUrls }: { content: string; imageUrls: string[] }) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")     // 删除代码块
    .replace(/`([^`]+)`/g, "$1")         // 行内代码 → 纯文本
    .replace(/#{1,6}\s+/g, "")           // 删除标题 #
    .replace(/\*\*(.+?)\*\*/g, "$1")     // 粗体 → 纯文本
    .replace(/\*(.+?)\*/g, "$1")         // 斜体 → 纯文本
    .replace(/~~(.+?)~~/g, "$1")         // 删除线 → 纯文本
    .replace(/^[-*+]\s+/gm, "")          // 无序列表符号
    .replace(/^\d+\.\s+/gm, "")          // 有序列表序号
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接 → 纯文本
    .replace(/^>\s+/gm, "")              // 引用符号
    .replace(/---+/g, "")                // 分割线
    .replace(/\n{3,}/g, "\n\n")          // 多余空行压缩
    .trim();
}

  async function handleAnalyze() {
    if (result) {
      setCollapsed(!collapsed);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content ,imageUrls}),
      });

      if (!res.ok) {
        throw new Error("分析请求失败");
      }

      const data = await res.json();
      setResult(stripMarkdown(data.result));
    } catch {
      setError("AI 分析失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-transparent bg-muted-foreground/10 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-green-500/30 hover:bg-green-500/10 hover:text-green-500 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        {loading ? "分析中..." : result ? "AI 概述" : "AI 分析"}
        {result &&
          !loading &&
          (collapsed ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronUp className="size-3" />
          ))}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {result && !collapsed && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-green-500">
            <Sparkles className="size-3" />
            AI 概述
          </div>
          <div className="whitespace-pre-line">{result}</div>
        </div>
      )}
    </div>
  );
}

function renderContent(content: string) {
  const parts = content.split(/(```\w*\n[\s\S]*?```)/);

  return parts.map((part, i) => {
    const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
    if (codeMatch) {
      const language = codeMatch[1] || "text";
      const code = codeMatch[2].trimEnd();
      return (
        <div key={i} className="relative">
          <CopyButton code={code} />
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            className="rounded-xl text-sm"
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }
    return part.trim() ? (
      <span key={i} className="whitespace-pre-line break-words">
        {part}
      </span>
    ) : null;
  });
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();

  return (
    <article className="group/post space-y-3 rounded-2xl bg-card p-5 shadow-sm">
      <div className="flex justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <UserTooltip user={post.user}>
            <Link
              href={`/users/${post.user.username}`}
              className="group/avatar relative shrink-0"
            >
              <div className="absolute -inset-1.5 rounded-full bg-green-500/0 blur-sm transition-all duration-300 group-hover/avatar:bg-green-500/30" />
              <div className="relative">
                <UserAvatar avatarUrl={post.user.avatarUrl} />
              </div>
            </Link>
          </UserTooltip>
          <div>
            <UserTooltip user={post.user}>
              <Link
                href={`/users/${post.user.username}`}
                className="block font-medium transition-colors duration-200 hover:text-green-500"
              >
                {post.user.displayName}
              </Link>
            </UserTooltip>
            <Link
              href={`/posts/${post.id}`}
              className="block text-sm text-muted-foreground hover:underline"
            >
              {formatRelativeDate(post.createAt)}
            </Link>
          </div>
        </div>
        {post.user.id === user.id && (
          <PostMoreButton
            post={post}
            className="opacity-0 transition-opacity group-hover/post:opacity-100"
          />
        )}
      </div>
      <Linkify>
        <div className="space-y-3">{renderContent(post.content)}</div>
      </Linkify>
      {!!post.attachments.length && (
        <MediaPreviews attachments={post.attachments} />
      )}
      <AIAnalyzeButton
        content={post.content}
        imageUrls={post.attachments
          .filter((a) => a.type === "IMAGE")
          .map((a) => a.url)}
      />
    </article>
  );
}

interface MediaPreviewsProps{
  attachments: Media[];
}

function MediaPreviews({attachments}: MediaPreviewsProps){
  return(
  <div className={cn("flex flex-col gap-3", attachments.length > 1 && "sm:grid sm:grid-cols-2")}>
    {attachments.map(m => (
      <MediaPreview key={m.id} media={m} />
    ))}
  </div>
  )
}

interface MediaPreviewProps{
  media: Media
}

function MediaPreview({media}: MediaPreviewProps){
  if(media.type === "IMAGE"){
    return <Image
    src={media.url}
    alt="Attachment"
    width={500}
    height={500}
    className="mx-auto size-fit max-h-[30rem] rounded-2xl"
    />
  }

  if(media.type === "VIDEO"){
    return <div>
      <video 
        src={media.url}
        controls
        className="mx-auto size-fit max-h-[30rem] rounded-2xl"
      />
    </div>
  }

  return <p className="text-destructive">不支持的视频类型</p>
}