"use client";

import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Trophy, ArrowLeft, Clock, Medal } from "lucide-react";
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

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-5 shadow-sm">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contest">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <Trophy className="size-5 text-primary" />
          <h1 className="text-xl font-bold">排行榜</h1>
        </div>

        <div className="rounded-2xl bg-card shadow-sm">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : !entries?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              暂无提交记录
            </div>
          ) : (
            <div className="divide-y">
              {/* 表头 */}
              <div className="flex items-center gap-4 px-5 py-3 text-sm font-medium text-muted-foreground">
                <span className="w-10 text-center">排名</span>
                <span className="flex-1">用户</span>
                <span className="w-20 text-center">通过题数</span>
                <span className="flex w-24 items-center justify-center gap-1">
                  <Clock className="size-3" />
                  罚时
                </span>
              </div>

              {entries.map((entry, index) => {
                const isMe = entry.user.id === user.id;
                const rank = index + 1;

                return (
                  <div
                    key={entry.user.id}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3 transition-colors",
                      isMe && "bg-primary/5",
                    )}
                  >
                    {/* 排名 */}
                    <div className="flex w-10 items-center justify-center">
                      {rank === 1 && (
                        <Medal className="size-5 text-amber-500" />
                      )}
                      {rank === 2 && (
                        <Medal className="size-5 text-gray-400" />
                      )}
                      {rank === 3 && (
                        <Medal className="size-5 text-amber-700" />
                      )}
                      {rank > 3 && (
                        <span className="text-sm text-muted-foreground">
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* 用户信息 */}
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

                    {/* 通过题数 */}
                    <div className="w-20 text-center text-sm font-semibold text-green-600">
                      {entry.solvedCount}
                    </div>

                    {/* 罚时 */}
                    <div className="w-24 text-center text-sm text-muted-foreground">
                      {entry.totalPenalty} 分钟
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
