"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import Link from "next/link";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

interface ContestDetail {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "UPCOMING" | "RUNNING" | "ENDED";
  isRegistered: boolean;
  problems: Array<{
    id: string;
    order: number;
    score: number;
    quiz: {
      id: string;
      title: string;
      difficulty: string;
      description: string;
      examples: Array<{ input: string; output: string; explanation?: string }>;
      testCases: Array<{ input: string; expectedOutput: string }>;
      starterCode: Record<string, string>;
      hints: string | null;
    };
  }>;
}

interface SubmitResult {
  allPassed: boolean;
  penalty: number;
  results: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }>;
}

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "typescript", label: "TypeScript" },
];

export default function ContestArena({ contestId }: { contestId: string }) {
  const { toast } = useToast();
  const [selectedProblem, setSelectedProblem] = useState(0);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<string>("");

  const { data: contest, isLoading } = useQuery({
    queryKey: ["contest-detail", contestId],
    queryFn: () =>
      kyInstance.get(`/api/contest/${contestId}`).json<ContestDetail>(),
  });

  // 倒计时
  useEffect(() => {
    if (!contest || contest.status !== "RUNNING") return;

    const timer = setInterval(() => {
      const end = new Date(contest.endTime).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft("已结束");
        clearInterval(timer);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [contest]);

  // 切换题目时加载 starterCode
  const loadStarterCode = useCallback(() => {
    if (!contest) return;
    const problem = contest.problems[selectedProblem];
    const starter = problem?.quiz.starterCode as Record<string, string>;
    setCode(starter?.[language] || "// 开始编写你的代码\n");
    setSubmitResult(null);
  }, [contest, selectedProblem, language]);

  useEffect(() => {
    loadStarterCode();
  }, [loadStarterCode]);

  // 提交代码
  const submitMutation = useMutation({
    mutationFn: async () => {
      const quizId = contest!.problems[selectedProblem].quiz.id;
      return kyInstance
        .post(`/api/contest/${contestId}/submit`, {
          json: { quizId, code, language },
        })
        .json<SubmitResult>();
    },
    onSuccess: (data) => {
      setSubmitResult(data);
      if (data.allPassed) {
        const quizId = contest!.problems[selectedProblem].quiz.id;
        setSolvedSet((prev) => new Set(prev).add(quizId));
        toast({ description: "通过！" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", description: "提交失败" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-8 text-center text-muted-foreground">竞赛不存在</div>
    );
  }

  const currentProblem = contest.problems[selectedProblem]?.quiz;

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row">
        {/* 左侧：题目列表 + 题目详情 */}
        <div className="w-full space-y-3 lg:w-2/5">
          {/* 比赛信息栏 */}
          <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="font-semibold">{contest.title}</h2>
            {contest.status === "RUNNING" && (
              <div className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
                <Clock className="size-3.5" />
                {timeLeft}
              </div>
            )}
            {contest.status === "ENDED" && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/contest/${contestId}/leaderboard`}>
                  排行榜
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            )}
          </div>

          {/* 题目标签 */}
          <div className="flex gap-2 overflow-x-auto rounded-2xl bg-card p-3 shadow-sm">
            {contest.problems.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setSelectedProblem(i)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedProblem === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80",
                )}
              >
                {solvedSet.has(p.quiz.id) && (
                  <CheckCircle2 className="size-3.5 text-green-400" />
                )}
                第 {i + 1} 题
              </button>
            ))}
          </div>

          {/* 题目详情 */}
          {currentProblem && (
            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold">{currentProblem.title}</h3>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                  currentProblem.difficulty === "easy" &&
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  currentProblem.difficulty === "medium" &&
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  currentProblem.difficulty === "hard" &&
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                )}
              >
                {currentProblem.difficulty === "easy"
                  ? "简单"
                  : currentProblem.difficulty === "medium"
                    ? "中等"
                    : "困难"}
              </span>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {currentProblem.description}
              </p>

              {(
                currentProblem.examples as Array<{
                  input: string;
                  output: string;
                  explanation?: string;
                }>
              )?.map((ex, i) => (
                <div key={i} className="mt-3 rounded-lg bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    示例 {i + 1}
                  </div>
                  <div className="mt-1 font-mono text-sm">
                    <div>
                      <span className="text-muted-foreground">输入：</span>
                      {ex.input}
                    </div>
                    <div>
                      <span className="text-muted-foreground">输出：</span>
                      {ex.output}
                    </div>
                    {ex.explanation && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：编辑器 + 结果 */}
        <div className="flex w-full flex-col gap-3 lg:w-3/5">
          {/* 工具栏 */}
          <div className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-sm">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={
                submitMutation.isPending || contest.status !== "RUNNING"
              }
            >
              {submitMutation.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : null}
              提交代码
            </Button>
          </div>

          {/* Monaco 编辑器 */}
          <div className="min-h-[400px] overflow-hidden rounded-2xl border shadow-sm">
            <MonacoEditor
              height="400px"
              language={language}
              value={code}
              onChange={(val) => setCode(val || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* 测试结果 */}
          {submitResult && (
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                {submitResult.allPassed ? (
                  <>
                    <CheckCircle2 className="size-5 text-green-600" />
                    <span className="font-semibold text-green-600">
                      全部通过！罚时 {submitResult.penalty} 分钟
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 text-red-600" />
                    <span className="font-semibold text-red-600">
                      未通过（
                      {submitResult.results.filter((r) => r.passed).length}/
                      {submitResult.results.length} 个用例通过）
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {submitResult.results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-2 text-xs font-mono",
                      r.passed
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {r.passed ? (
                        <CheckCircle2 className="size-3.5 text-green-600" />
                      ) : (
                        <XCircle className="size-3.5 text-red-600" />
                      )}
                      用例 {i + 1}
                    </div>
                    {!r.passed && (
                      <div className="mt-1 space-y-0.5 text-muted-foreground">
                        <div>输入：{r.input}</div>
                        <div>期望：{r.expected}</div>
                        <div>实际：{r.actual || "(空)"}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
