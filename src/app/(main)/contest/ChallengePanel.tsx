"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import {
  Loader2,
  Swords,
  Clock,
  Trophy,
  X,
  History,
  Target,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "../SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface ChallengeData {
  id: string;
  difficulty: string;
  status: "MATCHING" | "ONGOING" | "FINISHED" | "CANCELLED";
  timeLimit: number;
  winnerId: string | null;
  startedAt: string | null;
  createAt: string;
  challenger: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  opponent: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  quiz: {
    id: string;
    title: string;
    difficulty: string;
  } | null;
}

// 优化了配置项，加入了更丰富的颜色变量和对应的图标
const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    label: string;
    time: string;
    color: string;
    bg: string;
    border: string;
    activeBorder: string;
    icon: React.ElementType;
  }
> = {
  EASY: {
    label: "简单",
    time: "15 分钟",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    activeBorder: "border-emerald-500 ring-emerald-500/30",
    icon: Zap,
  },
  MEDIUM: {
    label: "中等",
    time: "30 分钟",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    activeBorder: "border-orange-500 ring-orange-500/30",
    icon: Target,
  },
  HARD: {
    label: "困难",
    time: "45 分钟",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    activeBorder: "border-rose-500 ring-rose-500/30",
    icon: Flame,
  },
};

export default function ChallengePanel() {
  const { user } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("EASY");
  const [matchingId, setMatchingId] = useState<string | null>(null);

  // 获取历史对战
  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => kyInstance.get("/api/challenge").json<ChallengeData[]>(),
  });

  // 轮询匹配状态
  const { data: matchStatus } = useQuery({
    queryKey: ["challenge-status", matchingId],
    queryFn: () =>
      kyInstance.get(`/api/challenge/${matchingId}`).json<ChallengeData>(),
    enabled: !!matchingId,
    refetchInterval: 2000,
  });

  // 匹配成功后跳转
  if (matchStatus?.status === "ONGOING" && matchingId) {
    router.push(`/contest/challenge/${matchingId}`);
  }

  // 发起匹配
  const matchMutation = useMutation({
    mutationFn: (difficulty: Difficulty) =>
      kyInstance
        .post("/api/challenge", { json: { difficulty } })
        .json<{ matched: boolean; challenge: ChallengeData }>(),
    onSuccess: (data) => {
      if (data.matched) {
        router.push(`/contest/challenge/${data.challenge.id}`);
      } else {
        setMatchingId(data.challenge.id);
        toast({ description: "正在寻找实力相当的对手..." });
      }
    },
    onError: () => {
      toast({ variant: "destructive", description: "发起匹配失败，请重试" });
    },
  });

  // 取消匹配
  const cancelMutation = useMutation({
    mutationFn: (challengeId: string) =>
      kyInstance.post(`/api/challenge/${challengeId}/cancel`).json(),
    onSuccess: () => {
      setMatchingId(null);
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast({ description: "已取消匹配" });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* 竞技场顶部卡片 */}
      <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-sm transition-all">
        {/* 背景装饰图案 */}
        <div className="pointer-events-none absolute -right-10 -top-10 opacity-5">
          <Swords className="size-64" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-2 flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
            <Swords className="size-4" />
            <span className="text-sm font-bold tracking-wider">竞技场 1V1</span>
          </div>
          <h2 className="mb-2 text-3xl font-extrabold tracking-tight">
            算法对决
          </h2>
          <p className="mb-8 text-center text-muted-foreground">
            选择合适的难度，系统将为你匹配对手。率先通过所有测试用例者胜！
          </p>

          {!matchingId ? (
            <div className="w-full max-w-2xl space-y-8">
              {/* 难度选择器 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  Object.entries(DIFFICULTY_CONFIG) as [
                    Difficulty,
                    typeof DIFFICULTY_CONFIG.EASY,
                  ][]
                ).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedDifficulty === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDifficulty(key)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-5 transition-all duration-200",
                        "hover:shadow-md",
                        isSelected
                          ? cn(config.activeBorder, config.bg, "ring-4")
                          : cn("border-transparent bg-muted/50 hover:bg-muted"),
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-full p-3 transition-colors duration-200",
                          isSelected ? "bg-background" : config.bg,
                        )}
                      >
                        <Icon className={cn("size-6", config.color)} />
                      </div>
                      <div className="space-y-1 text-center">
                        <div
                          className={cn(
                            "font-bold tracking-wide",
                            isSelected
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {config.label}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          {config.time}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 匹配按钮 */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="h-14 w-full max-w-sm rounded-full text-lg font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                  onClick={() => matchMutation.mutate(selectedDifficulty)}
                  disabled={matchMutation.isPending}
                >
                  {matchMutation.isPending ? (
                    <Loader2 className="mr-2 size-5 animate-spin" />
                  ) : (
                    <Swords className="mr-2 size-5" />
                  )}
                  开始寻找对手
                </Button>
              </div>
            </div>
          ) : (
            /* 匹配中状态 UI */
            <div className="flex w-full flex-col items-center justify-center py-10">
              <div className="relative mb-8 flex items-center justify-center">
                <div className="absolute size-32 animate-ping rounded-full bg-primary/20" />
                <div className="absolute size-24 animate-ping rounded-full bg-primary/40" style={{ animationDelay: "0.5s" }} />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
                  <Swords className="size-8 animate-pulse" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold">正在匹配对手...</h3>
              <p className="mb-8 text-sm text-muted-foreground">
                预计需要几秒钟时间，请稍候
              </p>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => cancelMutation.mutate(matchingId)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <X className="mr-2 size-4" />
                )}
                取消匹配
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 历史对战记录 */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2 border-b pb-4">
          <History className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">近期战绩</h3>
        </div>

        {isLoading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">加载战绩中...</p>
          </div>
        ) : !challenges?.length ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="rounded-full bg-muted p-4">
              <Swords className="size-8 opacity-20" />
            </div>
            <p className="text-sm">这里空空如也，快去完成你的第一场对局吧！</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {challenges
              .filter((c) => c.status !== "CANCELLED")
              .map((challenge) => {
                const isWinner = challenge.winnerId === user.id;
                const isLoser =
                  challenge.winnerId && challenge.winnerId !== user.id;
                const isDraw =
                  challenge.status === "FINISHED" && !challenge.winnerId;
                const isOngoing = challenge.status === "ONGOING";
                
                const opponent =
                  challenge.challenger.id === user.id
                    ? challenge.opponent
                    : challenge.challenger;

                return (
                  <div
                    key={challenge.id}
                    className="group flex flex-col justify-between gap-4 rounded-2xl border bg-card/50 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center"
                  >
                    {/* 左侧：对手信息 & 题目 */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <UserAvatar
                          avatarUrl={opponent?.avatarUrl || null}
                          size={46}
                        />
                        {/* 等待中的小点 */}
                        {challenge.status === "MATCHING" && (
                          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-yellow-500" />
                        )}
                      </div>
                      
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">vs</span>
                          <span className="font-semibold">
                            {opponent?.displayName || "等待分配中..."}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {challenge.quiz ? (
                            <span className="max-w-[150px] truncate sm:max-w-[250px]">
                              {challenge.quiz.title}
                            </span>
                          ) : (
                            <span>随机题目</span>
                          )}
                          <span className="size-1 rounded-full bg-border" />
                          <span>
                            {formatDistanceToNow(new Date(challenge.createAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 右侧：状态 & 操作 */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t pt-3 sm:border-0 sm:pt-0">
                      {/* 难度 Badge */}
                      <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {
                          DIFFICULTY_CONFIG[
                            challenge.difficulty as Difficulty
                          ]?.label
                        }
                      </span>

                      {/* 状态展示 */}
                      <div className="min-w-[80px] text-right">
                        {challenge.status === "FINISHED" && (
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
                              isWinner
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isLoser
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isWinner && <Trophy className="size-3.5" />}
                            {isWinner && "胜利"}
                            {isLoser && "失败"}
                            {isDraw && "平局"}
                          </div>
                        )}

                        {isOngoing && (
                          <Button
                            size="sm"
                            className="rounded-full shadow-sm"
                            asChild
                          >
                            <a href={`/contest/challenge/${challenge.id}`}>
                              重新连接
                            </a>
                          </Button>
                        )}

                        {challenge.status === "MATCHING" && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-amber-500">
                            <Loader2 className="size-3.5 animate-spin" />
                            匹配中
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}