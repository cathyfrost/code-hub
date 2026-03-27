import { useToast } from "@/components/ui/use-toast";
import {
  InfiniteData,
  QueryFilters,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { submitQuestion, acceptAnswer } from "./actions";
import { PostsPage } from "@/lib/types";
import { useRouter } from "next/navigation";

export function useSubmitQuestionMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitQuestion,
    onSuccess: async (newPost) => {
      const queryFilter = {
        queryKey: ["post-feed", "questions"],
      } satisfies QueryFilters;

      await queryClient.cancelQueries(queryFilter);

      queryClient.setQueriesData<InfiniteData<PostsPage, string | null>>(
        queryFilter,
        (oldData) => {
          const firstPage = oldData?.pages[0];
          if (firstPage) {
            return {
              pageParams: oldData.pageParams,
              pages: [
                {
                  posts: [newPost, ...firstPage.posts],
                  nextCursor: firstPage.nextCursor,
                },
                ...oldData.pages.slice(1),
              ],
            };
          }
        },
      );

      queryClient.invalidateQueries({
        queryKey: queryFilter.queryKey,
        predicate(query) {
          return !query.state.data;
        },
      });

      // 同时让主页 Feed 也感知到新帖
      queryClient.invalidateQueries({ queryKey: ["post-feed", "for-you"] });

      toast({
        description: "提问已发布，等待大佬解答 🎯",
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description:
          error.message === "积分不足，无法发布悬赏"
            ? "积分不足，请降低悬赏金额"
            : "发布失败，再试一次吧 😅",
      });
    },
  });

  return mutation;
}

export function useAcceptAnswerMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      postId,
      commentId,
    }: {
      postId: string;
      commentId: string;
    }) => acceptAnswer(postId, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["answers"] });

      toast({
        description: "已采纳最佳答案，积分已转给回答者 ✅",
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: error.message || "采纳失败，请稍后重试",
      });
    },
  });

  return mutation;
}

export function useDeleteQuestionMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (id: string) =>
      import("./actions").then((m) => m.deleteQuestion(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      toast({ description: "问题已删除，悬赏积分已退还" });
      router.push("/questions");
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: error.message || "删除失败，请重试",
      });
    },
  });

  return mutation;
}

export function useUpdateQuestionMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (input: {
      postId: string;
      content: string;
      mediaIds: string[];
    }) => import("./actions").then((m) => m.updateQuestion(input)),
    onSuccess: async (updatedPost) => {
      await queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["answers"] });
      router.push(`/questions/${updatedPost.id}`);
      router.refresh();
      toast({ description: "问题已更新" });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: error.message || "更新失败，请重试",
      });
    },
  });

  return mutation;
}
