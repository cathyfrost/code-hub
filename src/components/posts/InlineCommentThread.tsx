"use client";

import { useState } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { formatRelativeDate } from "@/lib/utils";
import { InlineCommentData } from "@/lib/types";
import { Loader2, Send } from "lucide-react";

interface InlineCommentThreadProps {
  postId: string;
  codeBlockIndex: number;
  lineNumber: number;
  comments: InlineCommentData[];
  onCommentAdded: (comment: InlineCommentData) => void;
}

export default function InlineCommentThread({
  postId,
  codeBlockIndex,
  lineNumber,
  comments,
  onCommentAdded,
}: InlineCommentThreadProps) {
  const { user } = useSession();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        <div key={c.id} className="mb-2 flex items-start gap-2">
          <UserAvatar
            avatarUrl={c.user.avatarUrl}
            className="size-6 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium">
                {c.user.displayName}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeDate(new Date(c.createAt))}
              </span>
            </div>
            <p className="text-sm text-foreground/80">{c.content}</p>
          </div>
        </div>
      ))}

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