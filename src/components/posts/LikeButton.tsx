"use client";

import { LikeInfo } from "@/lib/types";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import kyInstance from "@/lib/ky";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";

interface LikeButtonProps {
  postId: string;
  initialState: LikeInfo;
}

function spawnParticles(container: HTMLDivElement) {
  const shapes = ["circle", "heart"] as const;
  const colors = ["#ff4757", "#ff6b81", "#ee5a6f", "#ff8a9c", "#fc5c65"];

  for (let i = 0; i < 10; i++) {
    const el = document.createElement("span");
    const angle = (360 / 10) * i + (Math.random() * 20 - 10);
    const dist = 18 + Math.random() * 16;
    const rad = (angle * Math.PI) / 180;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = shape === "heart" ? 6 + Math.random() * 4 : 3 + Math.random() * 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const duration = 500 + Math.random() * 200;

    el.style.cssText = `
      position:absolute; top:50%; left:50%; pointer-events:none; z-index:20;
      width:${size}px; height:${size}px;
      ${shape === "circle" ? `border-radius:50%; background:${color};` : ""}
      ${shape === "heart" ? `background:transparent;` : ""}
      animation: pLike ${duration}ms cubic-bezier(.22,.61,.36,1) forwards;
      --px: ${Math.cos(rad) * dist}px;
      --py: ${Math.sin(rad) * dist}px;
      --rot: ${Math.random() * 360}deg;
    `;

    if (shape === "heart") {
      el.innerHTML = `<svg viewBox="0 0 24 24" width="${size * 1.5}" height="${size * 1.5}" fill="${color}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
    }

    container.appendChild(el);
    setTimeout(() => el.remove(), duration + 50);
  }
}

export default function LikeButton({ postId, initialState }: LikeButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [anim, setAnim] = useState<"like" | "unlike" | "idle">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const queryKey: QueryKey = ["like-info", postId];

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance.get(`/api/posts/${postId}/likes`).json<LikeInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const triggerAnim = useCallback(
    (type: "like" | "unlike") => {
      setAnim(type);
      if (type === "like" && containerRef.current) {
        spawnParticles(containerRef.current);
      }
      setTimeout(() => setAnim("idle"), 600);
    },
    [],
  );

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isLikedByUser
        ? kyInstance.delete(`/api/posts/${postId}/likes`)
        : kyInstance.post(`/api/posts/${postId}/likes`),
    onMutate: async () => {
      const wasLiked = data.isLikedByUser;
      triggerAnim(wasLiked ? "unlike" : "like");

      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<LikeInfo>(queryKey);

      queryClient.setQueryData<LikeInfo>(queryKey, () => ({
        likes:
          (previousState?.likes || 0) +
          (previousState?.isLikedByUser ? -1 : 1),
        isLikedByUser: !previousState?.isLikedByUser,
      }));

      return { previousState };
    },

    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "出错啦，请重试",
      });
    },
  });

  return (
    <>
      <style jsx global>{`
        @keyframes heartPop {
          0%   { transform: scale(1); }
          15%  { transform: scale(1.4); }
          30%  { transform: scale(0.85); }
          50%  { transform: scale(1.15); }
          70%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes heartBreak {
          0%   { transform: scale(1); }
          20%  { transform: scale(0.6) rotate(-8deg); }
          50%  { transform: scale(1.1) rotate(4deg); }
          70%  { transform: scale(0.9) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes ringPulse {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
        }
        @keyframes pLike {
          0%   { transform: translate(-50%,-50%) translate(0,0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--px),var(--py)) scale(0) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes numBump {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <button
        onClick={() => mutate()}
        className="group/like -ml-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200 hover:bg-red-500/10"
      >
        <div ref={containerRef} className="relative flex items-center justify-center">
          {/* 点赞时的扩散环 */}
          {anim === "like" && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 size-5 rounded-full border-2 border-red-400/60"
              style={{ animation: "ringPulse 0.5s ease-out forwards" }}
            />
          )}

          <Heart
            className={cn(
              "size-[18px] transition-colors duration-200",
              data.isLikedByUser
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground group-hover/like:text-red-400",
            )}
            style={
              anim === "like"
                ? { animation: "heartPop 0.5s cubic-bezier(.17,.89,.32,1.28)" }
                : anim === "unlike"
                  ? { animation: "heartBreak 0.45s ease-out" }
                  : undefined
            }
          />
        </div>

        <span
          className={cn(
            "text-sm font-medium tabular-nums transition-colors duration-200",
            data.isLikedByUser
              ? "text-red-500"
              : "text-muted-foreground group-hover/like:text-red-400",
          )}
          style={
            anim !== "idle"
              ? { animation: "numBump 0.35s ease-out" }
              : undefined
          }
        >
          {data.likes}
          <span className="hidden sm:inline"> 喜欢</span>
        </span>
      </button>
    </>
  );
}