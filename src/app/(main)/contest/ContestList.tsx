"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Loader2,
  ChevronRight,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import contest1 from "@/assets/contest1.png";
import contest2 from "@/assets/contest2.png";

/* ------------------------------------------------------------------ */
/* 类型                                                              */
/* ------------------------------------------------------------------ */

interface ContestData {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "RUNNING" | "ENDED";
  isRegistered: boolean;
  problems: Array<{
    id: string;
    order: number;
    score: number;
    quiz: { id: string; title: string; difficulty: string };
  }>;
  _count: {
    registrations: number;
    submissions: number;
  };
}

interface RankingUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  contestCount: number;
}

/* ------------------------------------------------------------------ */
/* 默认图片选择                                                      */
/* ------------------------------------------------------------------ */

const CONTEST_IMAGES = [contest1, contest2];

function getContestImage(index: number) {
  return CONTEST_IMAGES[index % CONTEST_IMAGES.length];
}

/* ------------------------------------------------------------------ */
/* 排行榜 Top3 奖牌颜色                                              */
/* ------------------------------------------------------------------ */

const MEDAL_BORDER = [
  "ring-amber-400/50",
  "ring-gray-300/50",
  "ring-amber-600/50",
];

const PODIUM_HEIGHTS = ["h-20", "h-14", "h-10"];
const PODIUM_BG = [
  "bg-gradient-to-t from-amber-500/20 to-amber-400/5",
  "bg-gradient-to-t from-gray-400/20 to-gray-300/5",
  "bg-gradient-to-t from-amber-700/20 to-amber-600/5",
];

/* ------------------------------------------------------------------ */
/* 主组件                                                            */
/* ------------------------------------------------------------------ */

export default function ContestList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contests, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: () => kyInstance.get("/api/contest").json<ContestData[]>(),
  });

  const { data: rankings } = useQuery({
    queryKey: ["contest-rankings"],
    queryFn: () => kyInstance.get("/api/contest/rankings").json<RankingUser[]>(),
  });

  const registerMutation = useMutation({
    mutationFn: (contestId: string) =>
      kyInstance.post(`/api/contest/${contestId}/register`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      toast({ description: "报名成功" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "报名失败" });
    },
  });

  const top3 = rankings?.slice(0, 3) || [];
  const rest = rankings?.slice(3, 10) || [];

  const podiumData = [];
  if (top3[1]) podiumData.push({ user: top3[1], realRank: 1, isFirst: false });
  if (top3[0]) podiumData.push({ user: top3[0], realRank: 0, isFirst: true });
  if (top3[2]) podiumData.push({ user: top3[2], realRank: 2, isFirst: false });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-5">
      {/* ====== 左侧：排行榜 ====== */}
      <div className="w-80 shrink-0 space-y-0 overflow-hidden rounded-2xl bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-bold">竞赛排名</h3>
        </div>

        {podiumData.length > 0 && (
          <div className="border-b px-4 pb-4 pt-6">
            <div className="flex items-end justify-center gap-3">
              {podiumData.map(({ user, realRank, isFirst }) => {
                const avatarSize = isFirst ? 56 : 44;

                return (
                  <div
                    key={user.id}
                    className="group flex cursor-pointer flex-col items-center transition-transform duration-300 hover:-translate-y-1.5"
                  >
                    <Link
                      href={`/users/${user.username}`}
                      className="relative block"
                    >
                      {isFirst && (
                        <Crown className="absolute -top-3.5 left-1/2 size-4 -translate-x-1/2 text-amber-500 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-125" />
                      )}
                      <div
                        className={cn(
                          "overflow-hidden rounded-full ring-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md",
                          MEDAL_BORDER[realRank],
                        )}
                      >
                        <UserAvatar
                          avatarUrl={user.avatarUrl}
                          size={avatarSize}
                        />
                      </div>
                    </Link>
                    <Link
                      href={`/users/${user.username}`}
                      className="mt-1.5 max-w-[72px] truncate text-xs font-semibold transition-colors duration-300 group-hover:text-primary"
                    >
                      {user.displayName}
                    </Link>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {user.rating}
                    </span>
                    <div
                      className={cn(
                        "mt-1.5 w-16 rounded-t-md transition-colors duration-300 group-hover:brightness-110",
                        PODIUM_HEIGHTS[realRank],
                        PODIUM_BG[realRank],
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="divide-y">
          {rest.map((user, idx) => (
            <div
              key={user.id}
              className="group flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-all duration-300 hover:translate-x-1 hover:bg-muted/80"
            >
              <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                {idx + 4}
              </span>
              <Link
                href={`/users/${user.username}`}
                className="block transition-transform duration-300 group-hover:scale-110"
              >
                <UserAvatar avatarUrl={user.avatarUrl} size={32} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${user.username}`}
                  className="block truncate text-[13px] font-semibold transition-colors duration-300 group-hover:text-primary"
                >
                  {user.displayName}
                </Link>
                <span className="text-[11px] text-muted-foreground">
                  参赛数: {user.contestCount}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold transition-transform duration-300 group-hover:scale-105">
                  {user.rating}
                </div>
              </div>
            </div>
          ))}

          {(!rankings || rankings.length === 0) && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无排名数据
            </div>
          )}
        </div>
      </div>

      {/* ====== 右侧：竞赛列表 ====== */}
      <div className="min-w-0 flex-1 space-y-3">
        {!contests?.length ? (
          <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">
            暂无竞赛
          </div>
        ) : (
          <div className="space-y-3">
            {contests.map((contest, idx) => (
              <div
                key={contest.id}
                className={cn(
                  "overflow-hidden rounded-2xl bg-card shadow-sm transition-all hover:shadow-md",
                  contest.status === "RUNNING" && "ring-2 ring-green-500/40",
                )}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={getContestImage(idx)}
                      alt={contest.title}
                      className="size-full object-cover transition-transform duration-500 hover:scale-105"
                      width={80}
                      height={80}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold">{contest.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(
                        new Date(contest.startTime),
                        "M月d日 EEE HH:mm",
                        { locale: zhCN },
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-center">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {contest.problems.length > 0
                        ? `0 / ${contest.problems.length}`
                        : ""}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {contest.status === "UPCOMING" && (
                      <>
                        {contest.isRegistered ? (
                          <span className="rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                            已报名
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            onClick={() =>
                              registerMutation.mutate(contest.id)
                            }
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "报名"
                            )}
                          </Button>
                        )}
                      </>
                    )}
                    {contest.status === "RUNNING" &&
                      contest.isRegistered && (
                        <Button
                          size="sm"
                          className="rounded-full text-xs"
                          asChild
                        >
                          <Link href={`/contest/${contest.id}`}>
                            进入比赛{" "}
                            <ChevronRight className="ml-0.5 size-3.5" />
                          </Link>
                        </Button>
                      )}
                    {contest.status === "ENDED" && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-xs"
                          asChild
                        >
                          <Link
                            href={`/contest/${contest.id}/leaderboard`}
                          >
                            排行榜
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-xs"
                          asChild
                        >
                          <Link href={`/contest/${contest.id}`}>补题</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}