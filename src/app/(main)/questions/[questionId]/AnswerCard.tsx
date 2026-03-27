"use client";

import { CommentData, PostData } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import CommentLikeButton from "@/components/comments/CommentLikeButton";
import { CheckCircle2, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcceptAnswerMutation } from "../mutations";
import { useToast } from "@/components/ui/use-toast";
import { useState, useCallback } from "react";
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

interface AnswerCardProps {
  comment: CommentData;
  post: PostData;
  isAccepted: boolean;
  canAccept: boolean;
}

function AnswerCodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="group relative my-3 rounded-md border bg-[#f6f8fa] dark:border-border dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b px-4 py-1.5 text-[12px] text-muted-foreground">
        <span>{language.toUpperCase() || "CODE"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <Copy className="size-3.5" />
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderAnswerContent(content: string) {
  const parts = content.split(/(```\w*\n[\s\S]*?```)/);
  return parts.map((part, i) => {
    const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
    if (codeMatch) {
      return (
        <AnswerCodeBlock
          key={i}
          language={codeMatch[1] || "text"}
          code={codeMatch[2].trimEnd()}
        />
      );
    }
    return part.trim() ? (
      <span key={i} className="whitespace-pre-line break-words">
        {part}
      </span>
    ) : null;
  });
}

export default function AnswerCard({
  comment,
  post,
  isAccepted,
  canAccept,
}: AnswerCardProps) {
  const { user } = useSession();
  const acceptMutation = useAcceptAnswerMutation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const isOP = comment.userId === post.userId;

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
      className={cn("border-b py-5 last:border-b-0")}
    >
      {/* 头部：头像 + 用户名 + 时间 */}
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/users/${comment.user.username}`}>
          <UserAvatar avatarUrl={comment.user.avatarUrl} size={32} />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/users/${comment.user.username}`}
            className={cn(
              "text-[13px] font-medium",
              isOP
                ? "rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-primary"
                : "text-primary hover:text-primary/80",
            )}
          >
            {comment.user.displayName}
          </Link>
          <span
            className="text-[13px] text-muted-foreground"
            suppressHydrationWarning
          >
            {formatRelativeDate(comment.createAt)}
          </span>
        </div>
      </div>

      {/* 已采纳标记 */}
      {isAccepted && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-[4px] bg-green-500/10 px-2 py-0.5 text-[12px] font-medium text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-3.5" />
          最佳答案
        </div>
      )}

      {/* 内容 */}
      <div className="text-[15px] leading-[1.8] text-foreground/90">
        {renderAnswerContent(comment.content)}
      </div>

      {/* 底部操作栏 */}
      <div className="mt-4 flex items-center gap-3">
        {/* 点赞 */}
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

        {/* 采纳按钮 */}
        {isAccepted && (
          <CheckCircle2
            className="size-5 text-green-500"
            strokeWidth={2}
          />
        )}
        {canAccept && !isAccepted && (
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

        {/* 分隔线 */}
        <div className="mx-1 h-4 w-px bg-border" />

        {/* 分享 */}
        <button
          onClick={handleShare}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground/80"
        >
          {copied ? "已复制" : "分享"}
        </button>

        {/* 三点菜单（仅作者可见） */}
        {comment.userId === user.id && (
          <AnswerMoreMenu comment={comment} />
        )}
      </div>
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