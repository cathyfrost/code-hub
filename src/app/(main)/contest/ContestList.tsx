"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Loader2, Trophy, Users, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function ContestList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contests, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: () => kyInstance.get("/api/contest").json<ContestData[]>(),
  });

  const registerMutation = useMutation({
    mutationFn: (contestId: string) =>
      kyInstance.post(`/api/contest/${contestId}/register`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      toast({ description: "报名成功！" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "报名失败" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!contests?.length) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">
        暂无竞赛
      </div>
    );
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "UPCOMING":
        return (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            即将开始
          </span>
        );
      case "RUNNING":
        return (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            进行中
          </span>
        );
      case "ENDED":
        return (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            已结束
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {contests.map((contest) => (
        <div
          key={contest.id}
          className={cn(
            "rounded-2xl bg-card p-5 shadow-sm transition-colors",
            contest.status === "RUNNING" && "ring-2 ring-primary/50",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                <h3 className="text-lg font-semibold">{contest.title}</h3>
                {statusLabel(contest.status)}
              </div>

              {contest.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {contest.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {format(new Date(contest.startTime), "M月d日 HH:mm", {
                    locale: zhCN,
                  })}
                  {" — "}
                  {format(new Date(contest.endTime), "HH:mm")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {contest._count.registrations} 人报名
                </span>
                <span>{contest.problems.length} 道题</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {contest.status === "UPCOMING" && (
                <>
                  {contest.isRegistered ? (
                    <span className="text-sm font-medium text-primary">
                      已报名
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => registerMutation.mutate(contest.id)}
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "报名参赛"
                      )}
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(contest.startTime), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                    开始
                  </span>
                </>
              )}

              {contest.status === "RUNNING" && contest.isRegistered && (
                <Button size="sm" asChild>
                  <Link href={`/contest/${contest.id}`}>
                    进入比赛
                    <ChevronRight className="ml-1 size-4" />
                  </Link>
                </Button>
              )}

              {contest.status === "ENDED" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/contest/${contest.id}/leaderboard`}>
                      排行榜
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/contest/${contest.id}`}>补题</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
