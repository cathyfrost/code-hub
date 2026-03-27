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

// 🛠️ 核心黑魔法：拦截 error，并向外暴露干净的 any 类型，让 TypeScript 闭嘴
async function withErrorCheck(actionPromise: Promise<any>): Promise<any> {
  const res = await actionPromise;
  if (res && typeof res === "object" && "error" in res) {
    throw new Error(res.error as string);
  }
  // 如果返回值被包在了 { data: ... } 里，自动解包
  return res && typeof res === "object" && "data" in res ? res.data : res;
}

export function useSubmitQuestionMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // 使用包装函数处理请求
    mutationFn: (input: Parameters<typeof submitQuestion>[0]) =>
      withErrorCheck(submitQuestion(input)),
    // 这里显式声明 any，解决 InfiniteData 类型推断报错
    onSuccess: async (newPost: any) => {
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

      queryClient.invalidateQueries({ queryKey: ["post-feed", "for-you"] });

      toast({
        description: "提问已发布，等待大佬解答 🎯",
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: error.message?.includes("积分不足")
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
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (input: { postId: string; commentId: string }) =>
      withErrorCheck(acceptAnswer(input.postId, input.commentId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["answers"] });
      router.refresh();

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
      withErrorCheck(import("./actions").then((m) => m.deleteQuestion(id))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      toast({ description: "问题已删除" });
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
    }) => withErrorCheck(import("./actions").then((m) => m.updateQuestion(input))),
    // 这里显式声明 any，解决 updatedPost.id 报错
    onSuccess: async (updatedPost: any) => {
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