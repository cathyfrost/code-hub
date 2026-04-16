"use client";

import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Trophy, ArrowLeft, Medal, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useSession } from "@/app/(main)/SessionProvider";

interface LeaderboardEntry {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  solvedCount: number;
  totalPenalty: number;
}

export default function Leaderboard({ contestId }: { contestId: string }) {
  const { user } = useSession();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", contestId],
    queryFn: () =>
      kyInstance
        .get(`/api/contest/${contestId}/leaderboard`)
        .json<LeaderboardEntry[]>(),
  });

  // 前三名
  const top3 = entries?.slice(0, 3) || [];
  const rest = entries?.slice(3) || [];

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-4">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 rounded-2xl bg-card p-5 shadow-sm">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contest">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <Trophy className="size-5 text-primary" />
          <h1 className="text-xl font-bold">排行榜</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center rounded-2xl bg-card p-8 shadow-sm">
            <Loader2 className="animate-spin" />
          </div>
        ) : !entries?.length ? (
          <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">
            暂无提交记录
          </div>
        ) : (
          <>
            {/* 领奖台 - 前三名 */}
            {top3.length > 0 && (
              <div className="rounded-2xl bg-card p-6 shadow-sm">
                <div className="flex items-end justify-center gap-4 pb-2 pt-4">
                  {/* 第二名 */}
                  {top3[1] && (
                    <div className="flex flex-col items-center">
                      <UserAvatar
                        avatarUrl={top3[1].user.avatarUrl}
                        size={56}
                      />
                      <div className="mt-2 max-w-[90px] truncate text-center text-sm font-semibold">
                        {top3[1].user.displayName}
                        {top3[1].user.id === user.id && (
                          <span className="ml-0.5 text-xs text-primary">(我)</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {top3[1].solvedCount} 题
                      </div>
                      <div className="mt-2 flex h-16 w-20 items-center justify-center rounded-t-lg bg-gray-300/20 dark:bg-gray-600/20">
                        <Medal className="size-6 text-gray-400" />
                      </div>
                    </div>
                  )}

                  {/* 第一名 */}
                  {top3[0] && (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <Crown className="absolute -top-4 left-1/2 size-5 -translate-x-1/2 text-amber-500" />
                        <UserAvatar
                          avatarUrl={top3[0].user.avatarUrl}
                          size={68}
                        />
                      </div>
                      <div className="mt-2 max-w-[90px] truncate text-center text-sm font-bold">
                        {top3[0].user.displayName}
                        {top3[0].user.id === user.id && (
                          <span className="ml-0.5 text-xs text-primary">(我)</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {top3[0].solvedCount} 题 · {top3[0].totalPenalty}min
                      </div>
                      <div className="mt-2 flex h-24 w-20 items-center justify-center rounded-t-lg bg-amber-500/10">
                        <Medal className="size-7 text-amber-500" />
                      </div>
                    </div>
                  )}

                  {/* 第三名 */}
                  {top3[2] && (
                    <div className="flex flex-col items-center">
                      <UserAvatar
                        avatarUrl={top3[2].user.avatarUrl}
                        size={52}
                      />
                      <div className="mt-2 max-w-[90px] truncate text-center text-sm font-semibold">
                        {top3[2].user.displayName}
                        {top3[2].user.id === user.id && (
                          <span className="ml-0.5 text-xs text-primary">(我)</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {top3[2].solvedCount} 题 · {top3[2].totalPenalty}min
                      </div>
                      <div className="mt-2 flex h-12 w-20 items-center justify-center rounded-t-lg bg-amber-700/10">
                        <Medal className="size-5 text-amber-700" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 第4名开始的列表 */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
                {/* 表头 */}
                <div className="flex items-center gap-4 border-b px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="w-12 text-center">排名</span>
                  <span className="flex-1">用户</span>
                  <span className="w-20 text-center">通过题数</span>
                  
                </div>

                <div className="divide-y">
                  {rest.map((entry, index) => {
                    const isMe = entry.user.id === user.id;
                    const rank = index + 4;

                    return (
                      <div
                        key={entry.user.id}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50",
                          isMe && "bg-primary/5",
                        )}
                      >
                        <div className="flex w-12 items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            {rank}
                          </span>
                        </div>

                        <div className="flex flex-1 items-center gap-3">
                          <UserAvatar
                            avatarUrl={entry.user.avatarUrl}
                            size={32}
                          />
                          <div>
                            <Link
                              href={`/users/${entry.user.username}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {entry.user.displayName}
                            </Link>
                            {isMe && (
                              <span className="ml-1 text-xs text-primary">
                                (我)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-20 text-center text-sm font-semibold text-green-600">
                          {entry.solvedCount}
                        </div>

                        <div className="w-24 text-center text-sm text-muted-foreground">
                          {entry.totalPenalty} 分钟
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}