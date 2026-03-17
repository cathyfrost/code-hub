"use client";

import { PostData } from "@/lib/types";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useState } from "react";
import {
  Copy,
  Check,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  MessageSquare,
} from "lucide-react";
import { useSession } from "@/app/(main)/SessionProvider";
import PostMoreButton from "./PostMoreButton";
import Linkify from "../Linkify";
import UserTooltip from "../UserTooltip";
import { Media } from "@prisma/client";
import Image from "next/image";
import LikeButton from "./LikeButton";
import BookmarkButton from "./BookmarkButton";
import Comments from "../comments/Comments";

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

function AIAnalyzeButton({
  content,
  imageUrls,
}: {
  content: string;
  imageUrls: string[];
}) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  function stripMarkdown(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^>\s+/gm, "")
      .replace(/---+/g, "")
      .replace(/\n{3,}/g, "\n\n")
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
        body: JSON.stringify({ content, imageUrls }),
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

// ── 超过此行数的代码块默认收起 ──
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
    <div className="relative">
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

function renderContent(content: string) {
  const parts = content.split(/(```\w*\n[\s\S]*?```)/);

  return parts.map((part, i) => {
    const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
    if (codeMatch) {
      const language = codeMatch[1] || "text";
      const code = codeMatch[2].trimEnd();
      return <CollapsibleCodeBlock key={i} language={language} code={code} />;
    }
    return part.trim() ? (
      <span key={i} className="whitespace-pre-line break-words">
        {part}
      </span>
    ) : null;
  });
}

// ── 图片灯箱弹窗 ──
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopyImage() {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级：复制图片链接
      await navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDownload() {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = src.split("/").pop() || "image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 顶部工具栏 */}
      <div
        className="fixed right-4 top-4 z-50 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCopyImage}
          className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          title="复制图片"
        >
          {copied ? (
            <Check className="size-5 text-green-400" />
          ) : (
            <Copy className="size-5" />
          )}
        </button>
        <button
          onClick={handleDownload}
          className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          title="下载图片"
        >
          <Download className="size-5" />
        </button>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          title="关闭"
        >
          <X className="size-5" />
        </button>
      </div>
      {/* 图片 */}
      <div
        className="relative h-[90vh] w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt="预览大图"
          fill
          className="rounded-lg object-contain"
        />
      </div>
    </div>
  );
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();

  const [showComments, setShowComments] = useState(false);

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
              suppressHydrationWarning
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
      <hr className="text-muted-foreground" />
      <div className="flex justify-between gap-5">
        <div className="flex items-center gap-5">
          <LikeButton
            postId={post.id}
            initialState={{
              likes: post._count.likes,
              isLikedByUser: post.likes.some((like) => like.userId === user.id),
            }}
          />
          <CommentButton
            post={post}
            onClick={() => setShowComments(!showComments)}
          />
        </div>
        <BookmarkButton
          postId={post.id}
          initialState={{
            isBookmarkedByUser: post.bookmarks.some(
              (bookmark) => bookmark.userId === user.id,
            ),
          }}
        />
      </div>
      {showComments && <Comments post={post} />}
    </article>
  );
}

interface MediaPreviewsProps {
  attachments: Media[];
}

function MediaPreviews({ attachments }: MediaPreviewsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        attachments.length > 1 && "sm:grid sm:grid-cols-2",
      )}
    >
      {attachments.map((m) => (
        <MediaPreview key={m.id} media={m} />
      ))}
    </div>
  );
}

interface MediaPreviewProps {
  media: Media;
}

function MediaPreview({ media }: MediaPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (media.type === "IMAGE") {
    return (
      <>
        <Image
          src={media.url}
          alt="Attachment"
          width={500}
          height={500}
          className="mx-auto size-fit max-h-[30rem] cursor-zoom-in rounded-2xl transition-opacity hover:opacity-90"
          onClick={() => setLightboxOpen(true)}
        />
        {lightboxOpen && (
          <ImageLightbox
            src={media.url}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  if (media.type === "VIDEO") {
    return (
      <div>
        <video
          src={media.url}
          controls
          className="mx-auto size-fit max-h-[30rem] rounded-2xl"
        />
      </div>
    );
  }

  return <p className="text-destructive">不支持的视频类型</p>;
}

interface CommentButtonProps {
  post: PostData;
  onClick: () => void;
}

function CommentButton({ post, onClick }: CommentButtonProps) {
  const [anim, setAnim] = useState<"idle" | "click">("idle");

  function handleClick() {
    setAnim("click");
    setTimeout(() => setAnim("idle"), 500);
    onClick();
  }

  return (
    <>
      <style jsx global>{`
        @keyframes bubblePop {
          0%   { transform: scale(1); }
          20%  { transform: scale(1.35); }
          40%  { transform: scale(0.85); }
          60%  { transform: scale(1.15); }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes numSlide {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <button
        onClick={handleClick}
        className="group/comment -ml-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200 hover:bg-primary/10"
      >
        <MessageSquare
          className="size-[18px] text-muted-foreground transition-all duration-200 group-hover/comment:text-primary group-hover/comment:scale-110"
          style={
            anim === "click"
              ? { animation: "bubblePop 0.5s cubic-bezier(.17,.89,.32,1.28)" }
              : undefined
          }
        />
        <span
          className="text-sm font-medium tabular-nums text-muted-foreground transition-colors duration-200 group-hover/comment:text-primary"
          style={
            anim === "click"
              ? { animation: "numSlide 0.35s ease-out" }
              : undefined
          }
        >
          {post._count.comments}{" "}
          <span className="hidden sm:inline">评论</span>
        </span>
      </button>
    </>
  );
}