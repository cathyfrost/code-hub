import { CommentsPage, PostData } from "@/lib/types";
import CommentInput from "./CommentInput";
import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import Comment from "./Comment";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

interface CommentsProps {
  post: PostData;
}

export default function Comments({ post }: CommentsProps) {
  const { data, fetchNextPage, hasNextPage, isFetching, status } =
    useInfiniteQuery({
      queryKey: ["comments", post.id],
      queryFn: ({ pageParam }) =>
        kyInstance
          .get(
            `/api/posts/${post.id}/comments`,
            pageParam ? { searchParams: { cursor: pageParam } } : {},
          )
          .json<CommentsPage>(),
      initialPageParam: null as string | null,
      getNextPageParam: (firstPage) => firstPage.previousCursor,
      select: (data) => ({
        pages: [...data.pages].reverse(),
        pageParams: [...data.pageParams].reverse(),
      }),
    });

  const comments = data?.pages.flatMap((page) => page.comments) || [];

  return (
    <div className="space-y-3">
      <CommentInput post={post} />

      {hasNextPage && (
        <Button
          variant="link"
          className="mx-auto block text-[13px] font-medium text-primary hover:text-primary/80 no-underline"
          disabled={isFetching}
          onClick={() => fetchNextPage()}
        >
          {isFetching ? "加载中..." : "显示更多回复"}
        </Button>
      )}

      {status === "pending" && (
        <div className="flex justify-center py-5">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {status === "success" && !comments.length && (
        <p className="py-8 text-center text-[13px] text-muted-foreground/50">
          还没有评论，来说点什么吧
        </p>
      )}

      {status === "error" && (
        <p className="py-4 text-center text-[13px] text-destructive/80">
          加载评论时发生错误
        </p>
      )}

      <div>
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment} post={post} />
        ))}
      </div>
    </div>
  );
}