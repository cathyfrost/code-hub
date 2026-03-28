"use client";

import { useState } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { formatRelativeDate } from "@/lib/utils";
import { InlineCommentData } from "@/lib/types";
import { Loader2, Send, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeleteInlineCommentDialog from "./DeleteInlineCommentDialog";

interface InlineCommentThreadProps {
  postId: string;
  codeBlockIndex: number;
  lineNumber: number;
  comments: InlineCommentData[];
  onCommentAdded: (comment: InlineCommentData) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export default function InlineCommentThread({
  postId,
  codeBlockIndex,
  lineNumber,
  comments,
  onCommentAdded,
  onCommentDeleted,
}: InlineCommentThreadProps) {
  const { user } = useSession();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingComment, setDeletingComment] = useState<InlineCommentData | null>(null);

  async function handleSubmit() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/inline-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lineNumber, codeBlockIndex }),
      });
      if (res.ok) {
        const newComment = await res.json();
        onCommentAdded(newComment);
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-l-2 border-green-500/40 bg-green-500/5 px-4 py-3">
      {comments.map((c) => (
        <div key={c.id} className="group/comment mb-2 flex items-start gap-2">
          <UserAvatar
            avatarUrl={c.user.avatarUrl}
            className="size-6 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">
                  {c.user.displayName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeDate(new Date(c.createAt))}
                </span>
              </div>
              
              {c.user.id === user.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* 👇 关键修复：加入 -my-1 抵消 p-1 撑开的高度，使所有人的评论行高严格对齐 */}
                    <button className="-my-1 shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover/comment:opacity-100">
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingComment(c);
                      }}
                    >
                      <Trash2 className="mr-2 size-4" />
                      删除批注
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="mt-1.5 text-sm text-foreground/80">{c.content}</p>
          </div>
        </div>
      ))}

      {deletingComment && (
        <DeleteInlineCommentDialog
          comment={deletingComment}
          postId={postId}
          open={!!deletingComment}
          onClose={() => setDeletingComment(null)}
          onDeleted={(commentId) => {
            onCommentDeleted?.(commentId);
            setDeletingComment(null);
          }}
        />
      )}

      <div className="mt-2 flex items-center gap-2">
        <UserAvatar avatarUrl={user.avatarUrl} className="size-6 shrink-0" />
        <div className="flex flex-1 items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="写一条行内批注…"
            rows={1}
            className="max-h-24 flex-1 resize-none bg-transparent text-sm leading-normal outline-none placeholder:text-muted-foreground/50"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="text-muted-foreground transition-colors hover:text-green-500 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}