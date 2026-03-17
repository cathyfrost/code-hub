"use client";

import { CommentLikeInfo } from "@/lib/types";
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

interface CommentLikeButtonProps {
  commentId: string;
  postId: string;
  initialState: CommentLikeInfo;
}

export default function CommentLikeButton({
  commentId,
  postId,
  initialState,
}: CommentLikeButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey: QueryKey = ["comment-like-info", commentId];

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance
        .get(`/api/posts/${postId}/comments/${commentId}/likes`)
        .json<CommentLikeInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isLikedByUser
        ? kyInstance.delete(
            `/api/posts/${postId}/comments/${commentId}/likes`,
          )
        : kyInstance.post(
            `/api/posts/${postId}/comments/${commentId}/likes`,
          ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousState =
        queryClient.getQueryData<CommentLikeInfo>(queryKey);

      queryClient.setQueryData<CommentLikeInfo>(queryKey, () => ({
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
    <button
      onClick={() => mutate()}
      className="group/clike flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors hover:bg-red-500/10"
    >
      <Heart
        className={cn(
          "size-3.5 transition-colors",
          data.isLikedByUser
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground group-hover/clike:text-red-400",
        )}
      />
      {data.likes > 0 && (
        <span
          className={cn(
            "text-xs tabular-nums transition-colors",
            data.isLikedByUser
              ? "text-red-500"
              : "text-muted-foreground group-hover/clike:text-red-400",
          )}
        >
          {data.likes}
        </span>
      )}
    </button>
  );
}