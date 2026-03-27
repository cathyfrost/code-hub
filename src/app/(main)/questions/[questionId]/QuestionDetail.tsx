"use client";

import { PostData, CommentsPage } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import { formatRelativeDate } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import {
  Coins,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Bell,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import CommentInput from "@/components/comments/CommentInput";
import AnswerCard from "./AnswerCard";
import AnswerMarkdown from "./AnswerMarkdown";
import QuestionVoteButton from "./QuestionVoteButton";
import { useDeleteQuestionMutation } from "../mutations";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { LevelBadge } from "./UserBadges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuestionDetailProps {
  post: PostData;
}

function parseQuestionContent(content: string) {
  const codeBlocks: string[] = [];
  const shielded = content.replace(/```\w*\n[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\u0000CB${codeBlocks.length - 1}\u0000`;
  });

  const lines = shielded.split("\n");
  const titleIdx = lines.findIndex((l) => l.trim());
  const titleRaw = titleIdx >= 0 ? lines[titleIdx] : "";
  const title = titleRaw.replace(/#[^\s#]+/g, "").trim() || "无标题";

  const tagMatches = shielded.match(/#[^\s#<>{};()]+/g) || [];
  const tags = [...new Set(tagMatches.map((t) => t.replace(/^#/, "")))].slice(
    0,
    8,
  );

  const bodyLines = [...lines];
  if (titleIdx >= 0) bodyLines[titleIdx] = "";
  let body = bodyLines.join("\n");
  body = body.replace(/#[^\s#<>{};()]+/g, "");
  body = body.replace(/\u0000CB(\d+)\u0000/g, (_, i) => codeBlocks[+i]);
  body = body.replace(/\n{3,}/g, "\n\n").trim();

  return { title, tags, body };
}

type SortMode = "votes" | "newest" | "oldest";

export default function QuestionDetail({ post }: QuestionDetailProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("votes");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const deleteQuestionMutation = useDeleteQuestionMutation();

  const { title, tags, body } = parseQuestionContent(post.content);
  const isAuthor = post.userId === user.id;

  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, { method: "POST" });
  }, [post.id]);

  const { data, fetchNextPage, hasNextPage, isFetching, status } =
    useInfiniteQuery({
      queryKey: ["answers", post.id],
      queryFn: ({ pageParam }) =>
        kyInstance
          .get(
            `/api/posts/${post.id}/answers`,
            pageParam ? { searchParams: { cursor: pageParam } } : {},
          )
          .json<CommentsPage>(),
      initialPageParam: null as string | null,
      getNextPageParam: (firstPage) => firstPage.previousCursor,
      select: (data) => ({
        pages: [...data.pages].reverse(),
        pageParams: [...data.pageParams].reverse(),
      }),
    });

  const comments = data?.pages.flatMap((page) => page.comments) || [];

  const sortedComments = [...comments].sort((a, b) => {
    if (post.acceptedCommentId === a.id) return -1;
    if (post.acceptedCommentId === b.id) return 1;
    if (sortMode === "votes") return b._count.likes - a._count.likes;
    if (sortMode === "newest")
      return new Date(b.createAt).getTime() - new Date(a.createAt).getTime();
    return new Date(a.createAt).getTime() - new Date(b.createAt).getTime();
  });

  function handleShare() {
    const url = `${window.location.origin}/questions/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ description: "链接已复制到剪贴板" });
    setTimeout(() => setCopied(false), 2000);
  }

  const sortLabels: Record<SortMode, string> = {
    votes: "按投票排序",
    newest: "最新优先",
    oldest: "最早优先",
  };

  return (
    <>
      <div>
        {/* ══════════ 问题头部 ══════════ */}
        <div className="border-b pb-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <Link href={`/users/${post.user.username}`}>
                <UserAvatar avatarUrl={post.user.avatarUrl} size={24} />
              </Link>
              <Link
                href={`/users/${post.user.username}`}
                className="font-medium text-primary hover:text-primary/80"
              >
                {post.user.displayName}
              </Link>
              <LevelBadge level={post.user.skillLevel || 1} />
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground" suppressHydrationWarning>
                提问于 {formatRelativeDate(post.createAt)}
              </span>
              {post.updateAt &&
                new Date(post.updateAt).getTime() -
                  new Date(post.createAt).getTime() >
                  60000 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span
                      className="text-muted-foreground"
                      suppressHydrationWarning
                    >
                      修改于 {formatRelativeDate(post.updateAt)}
                    </span>
                  </>
                )}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {post.viewCount ?? 0} 次查看
              </span>
            </div>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
                >
                  <MoreHorizontal className="size-5" />
                </button>
                {showMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-md border bg-card py-1 shadow-lg">
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteDialog(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                        删除问题
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <h1 className="mb-3 text-[27px] leading-[1.35] text-foreground/90">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[4px] bg-sky-500/10 px-[8px] py-[3px] text-[12px] text-sky-700 transition-colors hover:bg-sky-500/20 dark:bg-sky-400/10 dark:text-sky-400"
              >
                {tag}
              </span>
            ))}
            {post.bounty > 0 && !post.isResolved && (
              <span className="inline-flex items-center gap-1 rounded-[4px] bg-orange-500/10 px-2 py-[3px] text-[12px] font-medium text-orange-600 dark:text-orange-400">
                <Coins className="size-3.5" />
                悬赏 {post.bounty} 积分
              </span>
            )}
            {post.isResolved && (
              <span className="inline-flex items-center gap-1 rounded-[4px] bg-green-500/10 px-2 py-[3px] text-[12px] font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-3.5" />
                已解决
              </span>
            )}
          </div>
        </div>

        {/* ══════════ 正文 — Markdown 渲染 ══════════ */}
        <div className="border-b py-5">
          <AnswerMarkdown content={body} />

          <div className="mt-6 flex items-end justify-between">
            <div className="flex items-center gap-4">
              <QuestionVoteButton
                postId={post.id}
                initialState={{
                  likes: post._count.likes,
                  isLikedByUser: post.likes.some(
                    (like) => like.userId === user.id,
                  ),
                }}
              />
              <button
                onClick={handleShare}
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground/80"
              >
                {copied ? "已复制" : "分享"}
              </button>
              {isAuthor && (
                <Link
                  href={`/questions/${post.id}/edit`}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground/80"
                >
                  编辑
                </Link>
              )}
              <button
                onClick={() => {
                  setIsFollowing(!isFollowing);
                  toast({
                    description: isFollowing
                      ? "已取消关注此问题"
                      : "已关注此问题，有新回答会通知你",
                  });
                }}
                className={`flex items-center gap-1 text-[13px] transition-colors hover:text-foreground/80 ${
                  isFollowing
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Bell className="size-3.5" />
                {isFollowing ? "已关注" : "关注"}
              </button>
            </div>

            <div className="rounded-md bg-primary/[0.04] px-3 py-2">
              <div className="text-[11px] text-muted-foreground">
                {"提问于 "}
                <span suppressHydrationWarning>
                  {formatRelativeDate(post.createAt)}
                </span>
              </div>
              <Link
                href={`/users/${post.user.username}`}
                className="mt-1.5 flex items-center gap-2"
              >
                <UserAvatar avatarUrl={post.user.avatarUrl} size={32} />
                <span className="text-[13px] font-medium text-primary">
                  {post.user.displayName}
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════ 回答区 ══════════ */}
        <div className="pt-5">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-[19px] font-normal">
              {comments.length} 个回答
            </h2>
            <div className="relative">
              <span className="mr-2 text-[13px] text-muted-foreground">
                排序方式：
              </span>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] transition-colors hover:bg-muted/50"
              >
                {sortLabels[sortMode]}
                <ChevronDown className="size-3.5" />
              </button>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-md border bg-card py-1 shadow-lg">
                    {(["votes", "newest", "oldest"] as SortMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setSortMode(mode);
                            setShowSortMenu(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60 ${
                            sortMode === mode
                              ? "font-medium text-primary"
                              : "text-foreground/80"
                          }`}
                        >
                          {sortLabels[mode]}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-b py-4">
            <CommentInput post={post} />
          </div>

          {status === "pending" && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {sortedComments.map((comment) => (
            <AnswerCard
              key={comment.id}
              comment={comment}
              post={post}
              isAccepted={post.acceptedCommentId === comment.id}
              canAccept={
                isAuthor && !post.isResolved && comment.userId !== user.id
              }
            />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetching}
              className="w-full border-b py-3 text-center text-[13px] text-primary hover:bg-muted/30"
            >
              {isFetching ? "加载中..." : "加载更多回答"}
            </button>
          )}

          {status === "success" && comments.length === 0 && (
            <p className="py-14 text-center text-[14px] text-muted-foreground">
              还没有回答，来帮忙解决吧
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除此问题？</AlertDialogTitle>
            <AlertDialogDescription>
              {`确定要删除这条问题吗？此操作无法撤销。${!post.isResolved && post.bounty > 0 ? `悬赏的 ${post.bounty} 积分将退还到你的账户。` : post.isResolved && post.bounty > 0 ? `该问题已解决，悬赏的 ${post.bounty} 积分已转给回答者，不会退还。` : ""}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQuestionMutation.mutate(post.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}