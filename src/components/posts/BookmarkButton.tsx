"use client";

import { BookmarkInfo } from "@/lib/types";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import kyInstance from "@/lib/ky";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BookmarkButtonProps {
  postId: string;
  initialState: BookmarkInfo;
}

export default function BookmarkButton({
  postId,
  initialState,
}: BookmarkButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [anim, setAnim] = useState<"save" | "unsave" | "idle">("idle");
  const queryKey: QueryKey = ["bookmark-info", postId];

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance.get(`/api/posts/${postId}/bookmark`).json<BookmarkInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isBookmarkedByUser
        ? kyInstance.delete(`/api/posts/${postId}/bookmark`)
        : kyInstance.post(`/api/posts/${postId}/bookmark`),
    onMutate: async () => {
      setAnim(data.isBookmarkedByUser ? "unsave" : "save");
      setTimeout(() => setAnim("idle"), 500);

      toast({
        description: data.isBookmarkedByUser ? "已取消收藏" : "已收藏",
      });
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<BookmarkInfo>(queryKey);

      queryClient.setQueryData<BookmarkInfo>(queryKey, () => ({
        isBookmarkedByUser: !previousState?.isBookmarkedByUser,
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
        @keyframes bmDrop {
          0%   { transform: translateY(-6px) scale(1.3); opacity: 0.5; }
          50%  { transform: translateY(2px) scale(0.9); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes bmLift {
          0%   { transform: translateY(0) scale(1); }
          40%  { transform: translateY(-8px) scale(1.15); opacity: 0.6; }
          70%  { transform: translateY(-2px) scale(0.95); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      <button
        onClick={() => mutate()}
        className="group/bm flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200 hover:bg-primary/10"
      >
        <Bookmark
          className={cn(
            "size-5 transition-colors duration-200",
            data.isBookmarkedByUser
              ? "fill-primary text-primary"
              : "text-muted-foreground group-hover/bm:text-primary",
          )}
          style={
            anim === "save"
              ? { animation: "bmDrop 0.45s cubic-bezier(.34,1.56,.64,1)" }
              : anim === "unsave"
                ? { animation: "bmLift 0.4s ease-out" }
                : undefined
          }
        />
      </button>
    </>
  );
}