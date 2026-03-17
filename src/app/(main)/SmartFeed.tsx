"use client";

import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import kyInstance from "@/lib/ky";
import { PostData } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";

interface SmartFeedResponse {
  posts: PostData[];
  meta: {
    userId: string;
    totalCandidates: number;
    algorithm: string;
    weights: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
    };
    computeTimeMs: number;
  };
}

export default function SmartFeed() {
  const { data, status, refetch, isFetching } = useQuery({
    queryKey: ["post-feed", "smart"],
    queryFn: () =>
      kyInstance
        .get("/api/recommendations", {
          searchParams: { limit: "30" },
        })
        .json<SmartFeedResponse>(),
  });

  const posts = data?.posts || [];

  if (status === "pending") {
    return <PostsLoadingSkeleton />;
  }

  if (status === "success" && !posts.length) {
    return (
      <p className="text-center text-muted-foreground">
        暂无推荐内容，多互动后推荐会更精准。
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-destructive">
        加载推荐内容时出现错误。
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-green-500" />
          <span>
            基于你的兴趣和技能等级，从{" "}
            <span className="font-medium text-foreground">
              {data?.meta.totalCandidates}
            </span>{" "}
            篇帖子中为你精选
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border border-transparent bg-muted-foreground/10 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-green-500/30 hover:bg-green-500/10 hover:text-green-500 disabled:opacity-50"
        >
          {isFetching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            "换一批"
          )}
        </button>
      </div>
      <InfiniteScrollContainer className="space-y-5" onBottomReached={() => {}}>
        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </InfiniteScrollContainer>
    </div>
  );
}