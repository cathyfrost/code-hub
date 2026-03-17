"use client";

import { CommentData, PostData } from "@/lib/types";
import UserTooltip from "../UserTooltip";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import { formatRelativeDate } from "@/lib/utils";
import { useSession } from "@/app/(main)/SessionProvider";
import CommentMoreButton from "./CommentMoreButton";
import CommentLikeButton from "./CommentLikeButton";
import CommentInput from "./CommentInput";
import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface CommentProps {
  comment: CommentData;
  post: PostData;
  depth?: number;
}

export default function Comment({ comment, post, depth = 0 }: CommentProps) {
  const { user } = useSession();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 1);

  const replies = comment.replies || [];
  const replyCount = comment._count?.replies || 0;

  return (
    <div
      className={`${depth > 0 ? "ml-6 border-l-2 border-border/30 pl-3" : ""}`}
    >
      <div className="group/comment flex gap-3 px-1 py-3">
        <span className="shrink-0 pt-0.5">
          <UserTooltip user={comment.user}>
            <Link href={`/users/${comment.user.username}`}>
              <UserAvatar
                avatarUrl={comment.user.avatarUrl}
                size={depth > 0 ? 28 : 36}
              />
            </Link>
          </UserTooltip>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] leading-tight">
            <UserTooltip user={comment.user}>
              <Link
                href={`/users/${comment.user.username}`}
                className="truncate font-semibold text-foreground hover:underline"
              >
                {comment.user.displayName}
              </Link>
            </UserTooltip>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0 text-xs text-muted-foreground/60">
              {formatRelativeDate(comment.createAt)}
            </span>
          </div>

          <div className="mt-0.5 break-words text-[14px] leading-relaxed text-foreground/90">
            {comment.content}
          </div>

          <div className="mt-1 flex items-center gap-1">
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
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MessageSquare className="size-3.5" />
              回复
            </button>
          </div>

          {showReplyInput && (
            <div className="mt-2">
              <CommentInput
                post={post}
                parentId={comment.parentId || comment.id}
                replyToName={comment.user.username}
                replyToDisplayName={comment.user.displayName}
                onCancelReply={() => setShowReplyInput(false)}
              />
            </div>
          )}
        </div>

        {comment.user.id === user.id && (
          <CommentMoreButton
            comment={comment}
            className="ms-auto shrink-0 self-start opacity-0 transition-opacity group-hover/comment:opacity-100"
          />
        )}
      </div>

      {replyCount > 0 && !showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="ml-9 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ChevronDown className="size-3.5" />
          展开 {replyCount} 条回复
        </button>
      )}

      {showReplies && replies.length > 0 && (
        <div>
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply as CommentData}
              post={post}
              depth={depth + 1}
            />
          ))}
          {depth < 1 && replyCount > 0 && (
            <button
              onClick={() => setShowReplies(false)}
              className="ml-9 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
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
