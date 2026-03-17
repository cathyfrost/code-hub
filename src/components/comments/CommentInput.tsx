import { PostData } from "@/lib/types";
import React, { useState } from "react";
import { useSubmitCommentMutation } from "./mutations";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, SendHorizonal, X } from "lucide-react";

interface CommentInputProps {
  post: PostData;
  parentId?: string;
  replyToName?: string;
  replyToDisplayName?: string;
  onCancelReply?: () => void;
}

export default function CommentInput({
  post,
  parentId,
  replyToName,
  replyToDisplayName,
  onCancelReply,
}: CommentInputProps)  {
  const [input, setInput] = useState("");
  const [flyState, setFlyState] = useState<"idle" | "flying" | "returning">(
    "idle",
  );

  const mutation = useSubmitCommentMutation(post.id);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input) return;

    setFlyState("flying");

    mutation.mutate(
      {
        post,
        content: replyToDisplayName ? `回复@${replyToDisplayName}：${input}` : input,
        parentId,
      },
      {
        onSuccess: () => {
          setInput("");
          setTimeout(() => {
            setFlyState("returning");
            setTimeout(() => setFlyState("idle"), 350);
          }, 550);
          if (onCancelReply) onCancelReply();
        },
        onError: () => {
          setFlyState("idle");
        },
      },
    );
  }

  return (
    <>
      <style>{`
        @keyframes plane-fly-out {
          0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          40%  { transform: translate(10px, -8px) rotate(-8deg) scale(0.9); opacity: 0.9; }
          100% { transform: translate(36px, -28px) rotate(-18deg) scale(0.25); opacity: 0; }
        }
        @keyframes plane-fly-back {
          0%   { transform: translate(-16px, 12px) rotate(8deg) scale(0.5); opacity: 0; }
          60%  { opacity: 1; }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
        }
      `}</style>

      {replyToName && (
        <div className="flex items-center gap-1.5 px-1 pb-1">
          <span className="text-xs text-muted-foreground">
            回复{" "}
            <span className="font-medium text-foreground">@{replyToName}</span>
          </span>
          <button
            onClick={onCancelReply}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <form className="flex w-full items-center gap-2" onSubmit={onSubmit}>
        <Input
          placeholder={
            replyToName ? `回复 @${replyToName}...` : "发表一条友善的评论~"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          disabled={!input.trim() || mutation.isPending}
          className="relative overflow-visible"
        >
          {mutation.isPending && flyState === "idle" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <SendHorizonal
              className="transition-transform duration-100 active:scale-90"
              style={
                flyState === "flying"
                  ? {
                      animation:
                        "plane-fly-out 0.55s cubic-bezier(0.32, 0, 0.67, 0) forwards",
                    }
                  : flyState === "returning"
                    ? {
                        animation:
                          "plane-fly-back 0.35s cubic-bezier(0.33, 1, 0.68, 1) forwards",
                      }
                    : undefined
              }
            />
          )}
        </Button>
      </form>
    </>
  );
}
