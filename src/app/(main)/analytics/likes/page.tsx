"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface LikeItem {
  user: { username: string; displayName: string; avatarUrl: string | null };
  postId: string;
  postContent: string;
  postCreateAt: string;
}

interface LikesPage {
  items: LikeItem[];
  nextCursor: string | null;
}

export default function LikesPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["analytics-likes"],
      queryFn: ({ pageParam }) =>
        kyInstance
          .get("/api/analytics/likes", {
            searchParams: pageParam ? { cursor: pageParam } : {},
          })
          .json<LikesPage>(),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 pb-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/analytics"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="size-5 text-red-400" />
          <h1 className="text-lg font-semibold">收到的赞</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          暂无收到的赞
        </p>
      ) : (
        <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card">
          {items.map((item, i) => (
            <motion.div
              key={`${item.user.username}-${item.postId}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/20"
            >
              <Link href={`/users/${item.user.username}`}>
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {item.user.avatarUrl ? (
                    <Image
                      src={item.user.avatarUrl}
                      alt={item.user.displayName}
                      width={40}
                      height={40}
                      className="size-full object-cover"
                    />
                  ) : (
                    item.user.displayName.charAt(0)
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link
                    href={`/users/${item.user.username}`}
                    className="font-semibold hover:underline"
                  >
                    {item.user.displayName}
                  </Link>
                  <span className="text-muted-foreground"> 赞了你的帖子</span>
                </p>
                <Link
                  href={`/posts/${item.postId}`}
                  className="mt-1 line-clamp-2 block text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                >
                  {item.postContent}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "加载更多"
            )}
          </button>
        </div>
      )}
    </main>
  );
}
