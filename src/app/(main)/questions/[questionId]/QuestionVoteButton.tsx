"use client";

import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { cn } from "@/lib/utils";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useState, useRef, useCallback } from "react";

interface VoteInfo {
  likes: number;
  isLikedByUser: boolean;
}

interface QuestionVoteButtonProps {
  postId: string;
  initialState: VoteInfo;
}

function spawnParticles(container: HTMLElement, color: string) {
  const colors = [color, `${color}cc`, `${color}99`];
  for (let i = 0; i < 8; i++) {
    const el = document.createElement("span");
    const angle = (360 / 8) * i + (Math.random() * 30 - 15);
    const dist = 14 + Math.random() * 12;
    const rad = (angle * Math.PI) / 180;
    const size = 2.5 + Math.random() * 2;
    const c = colors[Math.floor(Math.random() * colors.length)];
    const duration = 450 + Math.random() * 200;

    el.style.cssText = `
      position:absolute; top:50%; left:50%; pointer-events:none; z-index:20;
      width:${size}px; height:${size}px; border-radius:50%; background:${c};
      animation: qvParticle ${duration}ms cubic-bezier(.22,.61,.36,1) forwards;
      --px: ${Math.cos(rad) * dist}px;
      --py: ${Math.sin(rad) * dist}px;
    `;

    container.appendChild(el);
    setTimeout(() => el.remove(), duration + 50);
  }
}

export default function QuestionVoteButton({
  postId,
  initialState,
}: QuestionVoteButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey: QueryKey = ["like-info", postId];

  const [upAnim, setUpAnim] = useState<"idle" | "pop" | "unpop">("idle");
  const [downAnim, setDownAnim] = useState<"idle" | "pop">("idle");
  const [downCount, setDownCount] = useState(0);
  const [isDownActive, setIsDownActive] = useState(false);
  const upRef = useRef<HTMLDivElement>(null);
  const downRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance.get(`/api/posts/${postId}/likes`).json<VoteInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const triggerUpAnim = useCallback((type: "pop" | "unpop") => {
    setUpAnim(type);
    if (type === "pop" && upRef.current) {
      spawnParticles(upRef.current, "#3b82f6");
    }
    setTimeout(() => setUpAnim("idle"), 550);
  }, []);

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isLikedByUser
        ? kyInstance.delete(`/api/posts/${postId}/likes`)
        : kyInstance.post(`/api/posts/${postId}/likes`),
    onMutate: async () => {
      const wasLiked = data.isLikedByUser;
      triggerUpAnim(wasLiked ? "unpop" : "pop");

      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<VoteInfo>(queryKey);
      queryClient.setQueryData<VoteInfo>(queryKey, () => ({
        likes:
          (previousState?.likes || 0) + (previousState?.isLikedByUser ? -1 : 1),
        isLikedByUser: !previousState?.isLikedByUser,
      }));
      return { previousState };
    },
    onError(error, _variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "操作失败，请重试",
      });
    },
  });

  function handleDownvote() {
    if (isDownActive) {
      setIsDownActive(false);
      setDownCount((c) => Math.max(0, c - 1));
    } else {
      setIsDownActive(true);
      setDownCount((c) => c + 1);
      toast({ description: "感谢你的反馈" });
      if (downRef.current) {
        spawnParticles(downRef.current, "#f97316");
      }
    }
    setDownAnim("pop");
    setTimeout(() => setDownAnim("idle"), 450);
  }

  return (
    <>
      <style jsx global>{`
        @keyframes qvThumbPop {
          0% {
            transform: scale(1) rotate(0deg);
          }
          20% {
            transform: scale(1.35) rotate(-8deg);
          }
          40% {
            transform: scale(0.85) rotate(4deg);
          }
          60% {
            transform: scale(1.15) rotate(-2deg);
          }
          80% {
            transform: scale(0.95) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes qvThumbUnpop {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(0.7) rotate(6deg);
          }
          50% {
            transform: scale(1.1) rotate(-3deg);
          }
          75% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes qvDownPop {
          0% {
            transform: scale(1) rotate(0deg);
          }
          30% {
            transform: scale(1.25) rotate(6deg);
          }
          60% {
            transform: scale(0.9) rotate(-3deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes qvRingPulse {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0;
          }
        }
        @keyframes qvParticle {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--px), var(--py))
              scale(0);
            opacity: 0;
          }
        }
        @keyframes qvNumBump {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          30% {
            transform: translateY(-3px);
            opacity: 0.7;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex items-center gap-2">
        {/* 点赞 */}
        <button
          onClick={() => mutate()}
          className={cn(
            "group/up relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all duration-200",
            data.isLikedByUser
              ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
              : "border-transparent text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500",
          )}
        >
          <div
            ref={upRef}
            className="relative flex items-center justify-center"
          >
            {upAnim === "pop" && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 size-5 rounded-full border-2 border-blue-400/50"
                style={{ animation: "qvRingPulse 0.45s ease-out forwards" }}
              />
            )}
            <ThumbsUp
              className={cn(
                "size-[18px] transition-all duration-200",
                data.isLikedByUser && "fill-blue-500",
                !data.isLikedByUser &&
                  "group-hover/up:-rotate-6 group-hover/up:scale-110",
              )}
              style={
                upAnim === "pop"
                  ? {
                      animation:
                        "qvThumbPop 0.5s cubic-bezier(.17,.89,.32,1.28)",
                    }
                  : upAnim === "unpop"
                    ? { animation: "qvThumbUnpop 0.4s ease-out" }
                    : undefined
              }
            />
          </div>
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={
              upAnim !== "idle"
                ? { animation: "qvNumBump 0.35s ease-out" }
                : undefined
            }
          >
            {data.likes}
          </span>
        </button>

        {/* 点踩 */}
        <button
          onClick={handleDownvote}
          className={cn(
            "group/down relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all duration-200",
            isDownActive
              ? "border-orange-500/30 bg-orange-500/10 text-orange-500"
              : "border-transparent text-muted-foreground hover:bg-orange-500/10 hover:text-orange-500",
          )}
        >
          <div
            ref={downRef}
            className="relative flex items-center justify-center"
          >
            {downAnim === "pop" && isDownActive && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 size-5 rounded-full border-2 border-orange-400/50"
                style={{ animation: "qvRingPulse 0.45s ease-out forwards" }}
              />
            )}
            <ThumbsDown
              className={cn(
                "size-[18px] transition-all duration-200",
                isDownActive && "fill-orange-500",
                !isDownActive &&
                  "group-hover/down:rotate-6 group-hover/down:scale-110",
              )}
              style={
                downAnim === "pop"
                  ? { animation: "qvDownPop 0.4s ease-out" }
                  : undefined
              }
            />
          </div>
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={
              downAnim === "pop"
                ? { animation: "qvNumBump 0.35s ease-out" }
                : undefined
            }
          >
            {downCount}
          </span>
        </button>
      </div>
    </>
  );
}
