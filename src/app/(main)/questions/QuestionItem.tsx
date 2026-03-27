"use client";

import { PostData } from "@/lib/types";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { formatRelativeDate } from "@/lib/utils";
import { Coins, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionItemProps {
  post: PostData;
}

export default function QuestionItem({ post }: QuestionItemProps) {
  const plainText = post.content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/#[^\s#]+/g, "")
    .replace(/\n+/g, " ")
    .trim();

  const title =
    post.content
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.replace(/#[^\s#]+/g, "")
      .trim()
      .slice(0, 100) || "无标题";

  const summary = plainText.replace(title, "").trim().slice(0, 160);

  const tags =
    post.content
      .replace(/```[\s\S]*?```/g, "")
      .match(/#[^\s#<>{};()]+/g)
      ?.map((t) => t.replace(/^#/, ""))
      .slice(0, 5) || [];

  const hasAcceptedAnswer = post.isResolved;
  const hasAnswers = post._count.comments > 0;

  return (
    <div className="flex gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/20">
      {/* ── 左侧统计列 ── */}
      <div className="flex w-[4.5rem] shrink-0 flex-col items-end gap-1 pt-0.5 text-[13px]">
        {/* 票数 */}
        <div className="flex h-[26px] items-center gap-0.5 rounded-[4px] border border-transparent px-1.5 transition-colors hover:border-border hover:bg-muted/40">
          <strong className="font-semibold text-foreground/80">
            {post._count.likes}
          </strong>
          <span className="text-muted-foreground"> 票</span>
        </div>

        {/* 回答数 */}
        <div
          className={cn(
            "flex h-[26px] items-center gap-0.5 rounded-[4px] px-1.5 transition-colors",
            hasAcceptedAnswer &&
              "bg-green-600 hover:bg-green-600/90 dark:bg-green-700",
            !hasAcceptedAnswer &&
              hasAnswers &&
              "border border-green-600/50 hover:border-green-600 dark:border-green-500/50",
            !hasAcceptedAnswer &&
              !hasAnswers &&
              "border border-transparent hover:border-border hover:bg-muted/40",
          )}
        >
          {hasAcceptedAnswer && (
            <CheckCircle2 className="mr-0.5 size-[13px] text-white/80" />
          )}
          <strong
            className={cn(
              "font-semibold",
              hasAcceptedAnswer && "text-white",
              !hasAcceptedAnswer &&
                hasAnswers &&
                "text-green-600 dark:text-green-400",
              !hasAcceptedAnswer && !hasAnswers && "text-foreground/80",
            )}
          >
            {post._count.comments}
          </strong>
          <span
            className={cn(
              hasAcceptedAnswer && "text-white/80",
              !hasAcceptedAnswer &&
                hasAnswers &&
                "text-green-600/70 dark:text-green-400/70",
              !hasAcceptedAnswer && !hasAnswers && "text-muted-foreground",
            )}
          >
            {" "}回答
          </span>
        </div>

        {/* 浏览数 */}
        <div className="flex h-[26px] items-center gap-0.5 rounded-[4px] border border-transparent px-1.5 transition-colors hover:border-border hover:bg-muted/40">
          <strong className="font-semibold text-foreground/80">
            {post.viewCount >= 1000
              ? `${(post.viewCount / 1000).toFixed(post.viewCount >= 10000 ? 0 : 1)}k`
              : post.viewCount}
          </strong>
          <span className="text-muted-foreground"> 浏览</span>
        </div>
      </div>

      {/* ── 右侧内容 ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 标题 + 状态标签 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/questions/${post.id}`}
            className="text-[15px] font-medium leading-snug text-primary hover:text-primary/80"
          >
            {title}
          </Link>
          {!post.isResolved && post.bounty > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              <Coins className="size-3" />+{post.bounty}
            </span>
          )}
          {post.isResolved && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-3" />
              已解决
            </span>
          )}
        </div>

        {/* 摘要 */}
        {summary && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80">
            {summary}
          </p>
        )}

        {/* 标签 + 用户信息 */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-1.5 pt-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-sky-500/8 px-1.5 py-0.5 text-[11px] text-sky-700 transition-colors hover:bg-sky-500/15 dark:bg-sky-400/10 dark:text-sky-400 dark:hover:bg-sky-400/20"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Link
              href={`/users/${post.user.username}`}
              className="flex items-center gap-1 font-medium text-primary hover:text-primary/80"
            >
              <UserAvatar avatarUrl={post.user.avatarUrl} size={16} />
              {post.user.displayName}
            </Link>
            <span>提问于</span>
            <span suppressHydrationWarning>
              {formatRelativeDate(post.createAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}