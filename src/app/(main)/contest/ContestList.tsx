"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Loader2,
  ChevronRight,
  Plus,
  X,
  Search,
  Check,
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

interface QuizOption {
  id: string;
  title: string;
  difficulty: string;
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
/* 创建竞赛弹窗                                                      */
/* ------------------------------------------------------------------ */

function CreateContestDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);

  const { data: quizzes, isLoading: searchLoading } = useQuery({
    queryKey: ["quiz-search", searchQuery],
    queryFn: () =>
      kyInstance
        .get("/api/quiz", { searchParams: { search: searchQuery } })
        .json<QuizOption[]>(),
    enabled: searchQuery.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      quizIds: string[];
    }) => kyInstance.post("/api/contest", { json: data }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      toast({ description: "竞赛创建成功" });
      onClose();
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setSelectedQuizIds([]);
      setSearchQuery("");
    },
    onError: () => {
      toast({ variant: "destructive", description: "创建失败" });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) return toast({ variant: "destructive", description: "请输入标题" });
    if (!startTime || !endTime) return toast({ variant: "destructive", description: "请设置时间" });
    if (new Date(endTime) <= new Date(startTime)) return toast({ variant: "destructive", description: "结束时间须晚于开始时间" });
    if (!selectedQuizIds.length) return toast({ variant: "destructive", description: "请至少选择一道题目" });
    createMutation.mutate({ title: title.trim(), description: description.trim(), startTime, endTime, quizIds: selectedQuizIds });
  };

  const toggleQuiz = (id: string) =>
    setSelectedQuizIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    );

  const diffColor = (d: string) => {
    if (d === "easy") return "text-emerald-600 bg-emerald-500/10";
    if (d === "medium") return "text-amber-600 bg-amber-500/10";
    return "text-rose-600 bg-rose-500/10";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">创建竞赛</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">竞赛标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：第 1 场周赛" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">描述（可选）</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简短描述" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">开始时间</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">结束时间</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">选择题目（已选 {selectedQuizIds.length} 道）</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索题目..." className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {searchQuery && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-background">
                {searchLoading ? (
                  <div className="flex justify-center p-3"><Loader2 className="size-4 animate-spin" /></div>
                ) : !quizzes?.length ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">未找到题目</div>
                ) : (
                  quizzes.map((quiz) => (
                    <button key={quiz.id} onClick={() => toggleQuiz(quiz.id)} className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50", selectedQuizIds.includes(quiz.id) && "bg-primary/5")}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{quiz.title}</span>
                        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", diffColor(quiz.difficulty))}>
                          {quiz.difficulty === "easy" ? "简单" : quiz.difficulty === "medium" ? "中等" : "困难"}
                        </span>
                      </div>
                      {selectedQuizIds.includes(quiz.id) && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedQuizIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedQuizIds.map((id, i) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    第 {i + 1} 题
                    <button onClick={() => toggleQuiz(id)} className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"><X className="size-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            创建竞赛
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 主组件                                                            */
/* ------------------------------------------------------------------ */

export default function ContestList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

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
  
  // 无论人数是 1、2 还是 3，都强制按照 左(第二名) - 中(第一名) - 右(第三名) 的顺序排列并绑定真实排名
  const podiumData = [];
  if (top3[1]) podiumData.push({ user: top3[1], realRank: 1, isFirst: false }); // 第2名
  if (top3[0]) podiumData.push({ user: top3[0], realRank: 0, isFirst: true });  // 第1名
  if (top3[2]) podiumData.push({ user: top3[2], realRank: 2, isFirst: false }); // 第3名

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <CreateContestDialog open={showCreate} onClose={() => setShowCreate(false)} />

      <div className="flex gap-5">
        {/* ====== 左侧：排行榜 ====== */}
        <div className="w-80 shrink-0 space-y-0 overflow-hidden rounded-2xl bg-card shadow-sm">
          {/* 标题 */}
          <div className="border-b px-5 py-4">
            <h3 className="text-base font-bold">竞赛排名</h3>
          </div>

          {/* Top 3 领奖台 */}
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
                      {/* 在这里添加 Link 组件实现头像点击跳转 */}
                      <Link href={`/users/${user.username}`} className="relative block">
                        {isFirst && (
                          <Crown className="absolute -top-3.5 left-1/2 size-4 -translate-x-1/2 text-amber-500 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-125" />
                        )}
                        <div className={cn(
                          "overflow-hidden rounded-full ring-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md", 
                          MEDAL_BORDER[realRank]
                        )}>
                          <UserAvatar avatarUrl={user.avatarUrl} size={avatarSize} />
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
                      {/* 柱子 */}
                      <div className={cn(
                        "mt-1.5 w-16 rounded-t-md transition-colors duration-300 group-hover:brightness-110", 
                        PODIUM_HEIGHTS[realRank], 
                        PODIUM_BG[realRank]
                      )} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 第4-10名列表 */}
          <div className="divide-y">
            {rest.map((user, idx) => (
              <div
                key={user.id}
                className="group flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-all duration-300 hover:translate-x-1 hover:bg-muted/80"
              >
                <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                  {idx + 4}
                </span>
                {/* 在这里添加 Link 组件包裹头像 */}
                <Link href={`/users/${user.username}`} className="transition-transform duration-300 group-hover:scale-110 block">
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
          {/* 创建按钮 */}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setShowCreate(true)}>
              <Plus className="size-4" />
              创建竞赛
            </Button>
          </div>

          {!contests?.length ? (
            <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">
              暂无竞赛，点击上方按钮创建
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
                    {/* 图片 */}
                    <div className="size-20 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={getContestImage(idx)}
                        alt={contest.title}
                        className="size-full object-cover transition-transform duration-500 hover:scale-105"
                        width={80}
                        height={80}
                      />
                    </div>

                    {/* 信息 */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold">{contest.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(contest.startTime), "M月d日 EEE HH:mm", { locale: zhCN })}
                      </p>
                    </div>

                    {/* 进度 */}
                    <div className="shrink-0 text-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {contest.problems.length > 0
                          ? `0 / ${contest.problems.length}`
                          : ""}
                      </span>
                    </div>

                    {/* 操作 */}
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
                              onClick={() => registerMutation.mutate(contest.id)}
                              disabled={registerMutation.isPending}
                            >
                              {registerMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "报名"}
                            </Button>
                          )}
                        </>
                      )}
                      {contest.status === "RUNNING" && contest.isRegistered && (
                        <Button size="sm" className="rounded-full text-xs" asChild>
                          <Link href={`/contest/${contest.id}`}>
                            进入比赛 <ChevronRight className="ml-0.5 size-3.5" />
                          </Link>
                        </Button>
                      )}
                      {contest.status === "ENDED" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="rounded-full text-xs" asChild>
                            <Link href={`/contest/${contest.id}/leaderboard`}>排行榜</Link>
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full text-xs" asChild>
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
    </>
  );
}