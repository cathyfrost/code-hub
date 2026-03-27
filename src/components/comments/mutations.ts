import {
  InfiniteData,
  QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import { deleteComment, submitComment } from "./action";
import { CommentsPage } from "@/lib/types";

export function useSubmitCommentMutation(postId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitComment,
    onSuccess: async (newComment) => {
      const queryKey: QueryKey = ["comments", postId];

      await queryClient.cancelQueries({ queryKey });

      if (newComment.parentId) {
        queryClient.invalidateQueries({ queryKey });
      } else {
        queryClient.setQueryData<InfiniteData<CommentsPage, string | null>>(
          queryKey,
          (oldData) => {
            const firstPage = oldData?.pages[0];
            if (firstPage) {
              return {
                pageParams: oldData.pageParams,
                pages: [
                  {
                    previousCursor: firstPage.previousCursor,
                    comments: [...firstPage.comments, newComment],
                  },
                  ...oldData.pages.slice(1),
                ],
              };
            }
          },
        );

        queryClient.invalidateQueries({
          queryKey,
          predicate(query) {
            return !query.state.data;
          },
        });
      }

      // 同时刷新问答区的回答列表
      await queryClient.invalidateQueries({
        queryKey: ["answers"],
      });

      toast({
        description: newComment.parentId ? "回复已发送" : "评论已发送",
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "发送失败，再试一次吧 😅",
      });
    },
  });

  return mutation;
}

export function useDeleteCommentMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: async (deletedComment) => {
      const queryKey: QueryKey = ["comments", deletedComment.postId];

      await queryClient.cancelQueries({ queryKey });

      queryClient.invalidateQueries({ queryKey });

      toast({
        description: "删除成功！",
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "删除失败，再试一次",
      });
    },
  });

  return mutation;
}
