"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { motion } from "framer-motion";
import { Bookmark, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface BookmarkItem {
  id: string;
  createAt: string;
  user: { username: string; displayName: string; avatarUrl: string | null };
  postId: string;
  postContent: string;
}

interface BookmarksPage {
  items: BookmarkItem[];
  nextCursor: string | null;
}

export default function BookmarksPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["analytics-bookmarks"],
      queryFn: ({ pageParam }) =>
        kyInstance
          .get("/api/analytics/bookmarks", {
            searchParams: pageParam ? { cursor: pageParam } : {},
          })
          .json<BookmarksPage>(),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/analytics" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Bookmark className="size-5 text-yellow-500" />
          <h1 className="text-lg font-semibold">收到的收藏</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-20">暂无收到的收藏</p>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-4 hover:bg-muted/20 transition-colors"
            >
              <Link href={`/users/${item.user.username}`}>
                <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0 overflow-hidden">
                  {item.user.avatarUrl ? (
                    <img src={item.user.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    item.user.displayName.charAt(0)
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/users/${item.user.username}`} className="font-semibold hover:underline">
                    {item.user.displayName}
                  </Link>
                  <span className="text-muted-foreground"> 收藏了你的帖子</span>
                </p>
                <span className="text-[11px] text-muted-foreground/50">
                  {formatDistanceToNow(new Date(item.createAt), { addSuffix: true, locale: zhCN })}
                </span>
                <Link
                  href={`/posts/${item.postId}`}
                  className="mt-2 block rounded-lg border border-border/30 bg-muted/20 p-2.5 text-xs text-muted-foreground/60 line-clamp-2 hover:bg-muted/40 transition-colors"
                >
                  {item.postContent}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : "加载更多"}
          </button>
        </div>
      )}
    </main>
  );
}