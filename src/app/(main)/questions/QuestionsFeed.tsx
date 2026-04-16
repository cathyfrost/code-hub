"use client";

import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import QuestionItem from "./QuestionItem";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "最新" },
  { key: "open", label: "悬赏中" },
  { key: "resolved", label: "已解决" },
  { key: "mine", label: "我的提问" },
] as const;

export default function QuestionsFeed() {
  const [activeTab, setActiveTab] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "questions", activeTab, activeTag],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get("/api/posts/questions", {
          searchParams: {
            ...(pageParam ? { cursor: pageParam } : {}),
            status: activeTab,
            ...(activeTag ? { tag: activeTag } : {}),
          },
        })
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  const emptyMessages: Record<string, string> = {
    all: "还没有人提问，做第一个吧",
    open: "暂无悬赏中的问题",
    resolved: "暂无已解决的问题",
    mine: "你还没有发布过提问",
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* 标签筛选提示条 */}
      {activeTag && (
        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-2.5">
          <span className="text-[13px] text-muted-foreground">
            筛选标签：
            <span className="ml-1 rounded bg-sky-500/8 px-1.5 py-0.5 text-[12px] text-sky-700 dark:bg-sky-400/10 dark:text-sky-400">
              {activeTag}
            </span>
          </span>
          <button
            onClick={() => setActiveTag(null)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
            清除
          </button>
        </div>
      )}

      {/* Tab 栏 */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <span className="text-sm text-muted-foreground">
          {status === "success" && `${posts.length} 个问题`}
        </span>
        <div className="flex overflow-hidden rounded-md border text-[13px]">
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-muted-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
                i > 0 && "border-l",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 加载骨架屏 */}
      {status === "pending" && (
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b px-5 py-4">
              <div className="flex w-[4.5rem] shrink-0 flex-col items-end gap-2">
                <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-14 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {status === "success" && !posts.length && !hasNextPage && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {emptyMessages[activeTab] || emptyMessages.all}
        </p>
      )}

      {/* 错误状态 */}
      {status === "error" && (
        <p className="py-8 text-center text-sm text-destructive">
          加载问题时出现错误
        </p>
      )}

      {/* 问题列表 */}
      {status === "success" && posts.length > 0 && (
        <InfiniteScrollContainer
          onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
        >
          {posts.map((post) => (
            <QuestionItem
              key={post.id}
              post={post}
              // onTagClick={(tag) => setActiveTag(tag)}
            />
          ))}
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </InfiniteScrollContainer>
      )}
    </div>
  );
}