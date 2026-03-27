"use client";

import { CommentData, PostData } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import CommentLikeButton from "@/components/comments/CommentLikeButton";
import CommentInput from "@/components/comments/CommentInput";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcceptAnswerMutation } from "../mutations";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AnswerMarkdown from "./AnswerMarkdown";
import { LevelBadge, OPBadge } from "./UserBadges";

interface AnswerCardProps {
  comment: CommentData;
  post: PostData;
  isAccepted: boolean;
  canAccept: boolean;
  depth?: number;
}

export default function AnswerCard({
  comment,
  post,
  isAccepted,
  canAccept,
  depth = 0,
}: AnswerCardProps) {
  const { user } = useSession();
  const acceptMutation = useAcceptAnswerMutation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 1);

  const isOP = comment.userId === post.userId;
  const replies = comment.replies || [];
  const replyCount = comment._count?.replies || 0;

  function handleShare() {
    const url = `${window.location.origin}/questions/${post.id}#answer-${comment.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ description: "链接已复制到剪贴板" });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      id={`answer-${comment.id}`}
      className={cn(
        depth > 0
          ? "ml-6 border-l-2 border-border/30 pl-4"
          : "border-b last:border-b-0",
        depth === 0 && "py-5",
        depth > 0 && "py-3",
      )}
    >
      {/* 头部：头像 + 用户名 + 徽章 + 时间 */}
      <div className="mb-3 flex items-center gap-1.5">
        <Link href={`/users/${comment.user.username}`}>
          <UserAvatar
            avatarUrl={comment.user.avatarUrl}
            size={depth > 0 ? 24 : 32}
          />
        </Link>
        <Link
          href={`/users/${comment.user.username}`}
          className="text-[13px] font-medium text-primary hover:text-primary/80"
        >
          {comment.user.displayName}
        </Link>
        {isOP && <OPBadge />}
        <LevelBadge level={comment.user.skillLevel || 1} />
        <span
          className="text-[12px] text-muted-foreground"
          suppressHydrationWarning
        >
          {formatRelativeDate(comment.createAt)}
        </span>
      </div>

      {/* 已采纳标记 */}
      {isAccepted && depth === 0 && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-[4px] bg-green-500/10 px-2 py-0.5 text-[12px] font-medium text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-3.5" />
          最佳答案
        </div>
      )}

      {/* 内容 — Markdown 渲染 */}
      <div className={cn(depth > 0 && "text-[14px]")}>
        <AnswerMarkdown content={comment.content} />
      </div>

      {/* 底部操作栏 */}
      <div className="mt-3 flex items-center gap-2">
        <CommentLikeButton
          commentId={comment.id}
          postId={post.id}
          initialState={{
            likes: comment._count.likes,
            isLikedByUser: comment.likes.some(
              (like) => like.userId === user.id,
            ),
          }}
        />

        {/* 采纳（仅顶级回答） */}
        {depth === 0 && isAccepted && (
          <CheckCircle2 className="size-5 text-green-500" strokeWidth={2} />
        )}
        {depth === 0 && canAccept && !isAccepted && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="rounded-full p-0.5 text-muted-foreground/30 transition-colors hover:text-green-500"
                title="采纳此回答"
              >
                <CheckCircle2 className="size-5" strokeWidth={2} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认采纳此回答？</AlertDialogTitle>
                <AlertDialogDescription>
                  {`采纳后该问题将标记为"已解决"${post.bounty > 0 ? `，悬赏的 ${post.bounty} 积分将转给回答者` : ""}。此操作不可撤销。`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    acceptMutation.mutate({
                      postId: post.id,
                      commentId: comment.id,
                    })
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  确认采纳
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* 回复按钮 */}
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageSquare className="size-3.5" />
          回复
        </button>

        {/* 分享（仅顶级） */}
        {depth === 0 && (
          <button
            onClick={handleShare}
            className="text-[12px] text-muted-foreground transition-colors hover:text-foreground/80"
          >
            {copied ? "已复制" : "分享"}
          </button>
        )}

        {/* 三点菜单（仅作者） */}
        {comment.userId === user.id && <AnswerMoreMenu comment={comment} />}
      </div>

      {/* 回复输入框 */}
      {showReplyInput && (
        <div className="ml-2 mt-3">
          <CommentInput
            post={post}
            parentId={comment.id}
            replyToName={comment.user.username}
            replyToDisplayName={comment.user.displayName}
            onCancelReply={() => setShowReplyInput(false)}
          />
        </div>
      )}

      {/* 展开/收起子回复 */}
      {replyCount > 0 && !showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="mt-2 flex items-center gap-1 text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          <ChevronDown className="size-3.5" />
          展开 {replyCount} 条回复
        </button>
      )}

      {showReplies && replies.length > 0 && (
        <div className="mt-1">
          {replies.map((reply) => (
            <AnswerCard
              key={reply.id}
              comment={reply as CommentData}
              post={post}
              isAccepted={false}
              canAccept={false}
              depth={depth + 1}
            />
          ))}
          {depth < 1 && replyCount > 0 && (
            <button
              onClick={() => setShowReplies(false)}
              className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronUp className="size-3.5" />
              收起回复
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerMoreMenu({ comment }: { comment: CommentData }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <div className="relative ml-auto">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[100px] rounded-md border bg-card py-1 shadow-lg">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteDialog(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
                删除
              </button>
            </div>
          </>
        )}
      </div>
      <DeleteAnswerDialog
        comment={comment}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />
    </>
  );
}

function DeleteAnswerDialog({
  comment,
  open,
  onClose,
}: {
  comment: CommentData;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) =>
      import("@/components/comments/action").then((m) => m.deleteComment(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["answers"] });
      toast({ description: "回答已删除" });
      onClose();
    },
    onError() {
      toast({ variant: "destructive", description: "删除失败，请重试" });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除此回答？</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除这条回答吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate(comment.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
