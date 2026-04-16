"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Clock,
  Copy,
  Check,
  Lightbulb,
  Trophy,
  RotateCcw,
  FileText,
  History,
  HardDrive,
  ArrowLeftIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "@/app/(main)/SessionProvider";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
] as const;

const DIFFICULTY_STYLE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  easy: { label: "简单", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  medium: { label: "中等", color: "text-amber-400", bg: "bg-amber-500/10" },
  hard: { label: "困难", color: "text-rose-400", bg: "bg-rose-500/10" },
};

/* ------------------------------------------------------------------ */
/*  localStorage 工具函数                                               */
/* ------------------------------------------------------------------ */

const CONTEST_CODE_PREFIX = "codehub-contest-";

function getSavedCode(
  contestId: string,
  quizId: string,
  lang: string,
): string | null {
  try {
    return localStorage.getItem(
      `${CONTEST_CODE_PREFIX}${contestId}-${quizId}-${lang}`,
    );
  } catch {
    return null;
  }
}

function saveCode(
  contestId: string,
  quizId: string,
  lang: string,
  code: string,
) {
  try {
    localStorage.setItem(
      `${CONTEST_CODE_PREFIX}${contestId}-${quizId}-${lang}`,
      code,
    );
  } catch {}
}

function clearSavedCode(contestId: string, quizId: string, lang: string) {
  try {
    localStorage.removeItem(
      `${CONTEST_CODE_PREFIX}${contestId}-${quizId}-${lang}`,
    );
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  类型                                                               */
/* ------------------------------------------------------------------ */

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
    time?: string;
    memory?: number;
  }>;
}

interface SubmissionRecord {
  id: string;
  passed: boolean;
  language: string;
  penalty: number;
  createAt: string;
  time: number | null;
  memory: number | null;
}

type LeftTab = "description" | "solutions" | "submissions";

/* ------------------------------------------------------------------ */
/*  复制按钮                                                           */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title="复制"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  通过详情页（力扣风格）                                               */
/* ------------------------------------------------------------------ */

function PassedDetail({
  result,
  contest,
  onBack,
}: {
  result: SubmitResult;
  contest: ContestDetail;
  onBack: () => void;
}) {
  const { user } = useSession();
  const totalCases = result.results.length;
  const passedCases = result.results.filter((r) => r.passed).length;

  // 计算用时（从比赛开始到现在）
  const startTime = new Date(contest.startTime).getTime();
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const elapsedStr = `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`;

  // 总执行时间
  const totalTime = result.results
    .filter((r) => r.time)
    .reduce((sum, r) => sum + parseFloat(r.time || "0"), 0);

  // 总内存
  const totalMemory = result.results
    .filter((r) => r.memory)
    .reduce((sum, r) => sum + (r.memory || 0), 0);

  const now = new Date();
  const submitTimeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="p-5">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          返回提交记录
        </button>

        {/* 通过状态 */}
        <div className="mb-1">
          <span className="text-2xl font-extrabold text-emerald-500">通过</span>
        </div>
        <div className="mb-1 text-sm text-muted-foreground">
          {passedCases} / {totalCases} 个通过的测试用例
        </div>
        <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{user.displayName}</span>
          <span>提交于 {submitTimeStr}</span>
        </div>

        {/* 执行用时分布 */}
        <div className="mb-6 rounded-xl border bg-accent/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            执行用时分布
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {totalTime > 0 ? `${(totalTime * 1000).toFixed(0)}` : "0"}
            </span>
            <span className="text-sm text-muted-foreground">ms</span>
          </div>
          {/* 简化的分布条 */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* 消耗内存分布 */}
        <div className="rounded-xl border bg-accent/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            消耗内存分布
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {totalMemory > 0 ? `${(totalMemory / 1024).toFixed(2)}` : "N/A"}
            </span>
            {totalMemory > 0 && (
              <span className="text-sm text-muted-foreground">MB</span>
            )}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  主组件                                                              */
/* ------------------------------------------------------------------ */

export default function ContestArena({ contestId }: { contestId: string }) {
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();

  const [selectedProblem, setSelectedProblem] = useState(0);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState("");
  const [showHint, setShowHint] = useState(false);

  // 左侧 Tab
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [showPassedDetail, setShowPassedDetail] = useState(false);

  // 提交记录
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);

  // 面板布局
  const [leftWidth, setLeftWidth] = useState(42);
  const [resultHeight, setResultHeight] = useState(224);
  const [resultCollapsed, setResultCollapsed] = useState(false);
  const isDraggingResult = useRef(false);
  const resultStartY = useRef(0);
  const resultStartH = useRef(0);

  /* ------ 获取竞赛详情 ------ */
  const { data: contest, isLoading } = useQuery({
    queryKey: ["contest-detail", contestId],
    queryFn: () =>
      kyInstance.get(`/api/contest/${contestId}`).json<ContestDetail>(),
  });

  /* ------ 获取提交记录 ------ */
  const fetchSubmissions = useCallback(async () => {
    if (!contest) return;
    const quizId = contest.problems[selectedProblem]?.quiz.id;
    if (!quizId) return;
    try {
      const data = await kyInstance
        .get(`/api/contest/${contestId}/submissions`, {
          searchParams: { quizId },
        })
        .json<SubmissionRecord[]>();
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    }
  }, [contest, contestId, selectedProblem]);

  useEffect(() => {
    if (leftTab === "submissions") {
      fetchSubmissions();
    }
  }, [leftTab, fetchSubmissions]);

  /* ------ 倒计时 ------ */
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

  /* ------ 切题加载代码 ------ */
  const loadStarterCode = useCallback(() => {
    if (!contest) return;
    const problem = contest.problems[selectedProblem];
    if (!problem) return;
    const quizId = problem.quiz.id;
    const saved = getSavedCode(contestId, quizId, language);
    if (saved) {
      setCode(saved);
    } else {
      const starter = problem.quiz.starterCode as Record<string, string>;
      setCode(starter?.[language] || "// 开始编写你的代码\n");
    }
    setSubmitResult(null);
    setShowHint(false);
    setShowPassedDetail(false);
    setLeftTab("description");
  }, [contest, contestId, selectedProblem, language]);

  useEffect(() => {
    loadStarterCode();
  }, [loadStarterCode]);

  /* ------ 实时保存代码到 localStorage ------ */
  useEffect(() => {
    if (!contest || !code) return;
    const problem = contest.problems[selectedProblem];
    if (!problem) return;
    saveCode(contestId, problem.quiz.id, language, code);
  }, [code, contest, contestId, selectedProblem, language]);

  /* ------ 语言切换 ------ */
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (!contest) return;
    const problem = contest.problems[selectedProblem];
    if (!problem) return;
    const quizId = problem.quiz.id;
    const saved = getSavedCode(contestId, quizId, lang);
    if (saved) {
      setCode(saved);
    } else {
      const starter = problem.quiz.starterCode as Record<string, string>;
      setCode(starter?.[lang] || "// 开始编写你的代码\n");
    }
    setSubmitResult(null);
  };

  /* ------ 复制代码 ------ */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ------ 重置代码 ------ */
  const handleReset = () => {
    if (!contest) return;
    const problem = contest.problems[selectedProblem];
    if (!problem) return;
    const starter = problem.quiz.starterCode as Record<string, string>;
    setCode(starter?.[language] || "// 开始编写你的代码\n");
    clearSavedCode(contestId, problem.quiz.id, language);
    setSubmitResult(null);
  };

  /* ------ 提交代码 ------ */
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
      setResultCollapsed(false);
      if (data.allPassed) {
        const quizId = contest!.problems[selectedProblem].quiz.id;
        setSolvedSet((prev) => new Set(prev).add(quizId));
        toast({ description: "🎉 通过！" });
        // 自动切到通过详情页
        setShowPassedDetail(true);
        setLeftTab("submissions");
      }
    },
    onError: () => {
      toast({ variant: "destructive", description: "提交失败，请重试" });
    },
  });

  /* ------ 拖拽分隔栏（左右） ------ */
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const container = (e.target as HTMLElement).parentElement;
      if (!container) return;
      const startX = e.clientX;
      const containerWidth = container.getBoundingClientRect().width;
      const startLeftWidth = leftWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const newWidth = startLeftWidth + (delta / containerWidth) * 100;
        setLeftWidth(Math.min(Math.max(newWidth, 25), 65));
      };
      const onUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [leftWidth],
  );

  /* ------ 拖拽判题结果面板（上下） ------ */
  const handleResultDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDraggingResult.current = true;
      resultStartY.current = e.clientY;
      resultStartH.current = resultHeight;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!isDraggingResult.current) return;
        const delta = resultStartY.current - ev.clientY;
        setResultHeight(
          Math.min(
            Math.max(resultStartH.current + delta, 100),
            window.innerHeight * 0.6,
          ),
        );
      };

      const onUp = () => {
        isDraggingResult.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [resultHeight],
  );

  /* ------ 加载 / 错误状态 ------ */
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-destructive">竞赛不存在</p>
        <Button variant="outline" asChild>
          <Link href="/contest">返回竞赛</Link>
        </Button>
      </div>
    );
  }

  const currentQuiz = contest.problems[selectedProblem]?.quiz;
  const diffConfig = currentQuiz
    ? DIFFICULTY_STYLE[currentQuiz.difficulty]
    : null;
  const examples = (currentQuiz?.examples || []) as Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;

  return (
    <div className="flex h-full flex-col gap-0">
      {/* ====== 顶部状态栏 ====== */}
      <div className="flex h-11 flex-none items-center justify-between rounded-t-xl border bg-card px-4">
        <div className="flex items-center gap-2">
          <Link
            href="/contest"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">竞赛</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <span className="text-sm font-semibold">{contest.title}</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {contest.problems.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedProblem(i)}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                selectedProblem === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {solvedSet.has(p.quiz.id) && (
                <CheckCircle2 className="size-3 text-emerald-400" />
              )}
              第{i + 1}题
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {contest.status === "RUNNING" && timeLeft && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                parseInt(timeLeft) <= 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Clock className="size-3" />
              {timeLeft}
            </div>
          )}
          {contest.status === "ENDED" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link href={`/contest/${contestId}/leaderboard`}>
                <Trophy className="mr-1 size-3" />
                排行榜
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ====== 主体：左右分栏 ====== */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* ── 左侧面板 ── */}
        <div
          className="flex min-h-0 shrink-0 flex-col overflow-hidden border-x border-b bg-card"
          style={{ flex: `0 0 ${leftWidth}%` }}
        >
          {/* Tab 栏 */}
          <div className="flex h-11 flex-none items-center gap-0 border-b px-2">
            <button
              onClick={() => {
                setLeftTab("description");
                setShowPassedDetail(false);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                leftTab === "description" && !showPassedDetail
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="h-3 w-3" />
              题目描述
            </button>
            
            <button
              onClick={() => {
                setLeftTab("submissions");
                setShowPassedDetail(false);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                leftTab === "submissions" || showPassedDetail
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <History className="h-3 w-3" />
              提交记录
            </button>
          </div>

          {/* Tab 内容 */}
          {/* ── 题目描述 ── */}
          {leftTab === "description" && !showPassedDetail && (
            <div className="min-h-0 flex-1 overflow-auto">
              {currentQuiz && (
                <div className="space-y-5 p-5">
                  {/* 标题 + 难度 */}
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">
                      {currentQuiz.title}
                    </span>
                    {diffConfig && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${diffConfig.color} ${diffConfig.bg}`}
                      >
                        {diffConfig.label}
                      </span>
                    )}
                    {solvedSet.has(currentQuiz.id) && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {currentQuiz.description.split("\n").map((line, i) => {
                      if (line.startsWith("## ")) {
                        return (
                          <h3
                            key={i}
                            className="mb-1.5 mt-5 border-b border-border/50 pb-1.5 text-sm font-bold"
                          >
                            {line.replace("## ", "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <p
                            key={i}
                            className="ml-3 flex gap-1.5 text-[13px] text-muted-foreground"
                          >
                            <span className="shrink-0 text-primary/60">•</span>
                            {renderInlineCode(line.replace("- ", ""))}
                          </p>
                        );
                      }
                      if (line.trim() === "")
                        return <div key={i} className="h-1.5" />;
                      return (
                        <p
                          key={i}
                          className="text-[13px] leading-relaxed text-foreground/85"
                        >
                          {renderInlineCode(line)}
                        </p>
                      );
                    })}
                  </div>

                  {examples.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="border-b border-border/50 pb-1.5 text-sm font-bold">
                        示例
                      </h3>
                      {examples.map((ex, i) => (
                        <div
                          key={i}
                          className="overflow-hidden rounded-lg border bg-accent/20"
                        >
                          <div className="border-b bg-accent/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                            示例 {i + 1}
                          </div>
                          <div className="space-y-2 p-3">
                            <div className="grid grid-cols-[48px_1fr] gap-1 text-xs">
                              <span className="font-semibold text-muted-foreground">
                                输入
                              </span>
                              <div className="group relative">
                                <pre className="overflow-x-auto rounded-md bg-background/80 px-2.5 py-1.5 pr-8 font-mono text-[12px]">
                                  {ex.input}
                                </pre>
                                <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <CopyButton text={ex.input} />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-[48px_1fr] gap-1 text-xs">
                              <span className="font-semibold text-muted-foreground">
                                输出
                              </span>
                              <div className="group relative">
                                <pre className="overflow-x-auto rounded-md bg-background/80 px-2.5 py-1.5 pr-8 font-mono text-[12px]">
                                  {ex.output}
                                </pre>
                                <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <CopyButton text={ex.output} />
                                </div>
                              </div>
                            </div>
                            {ex.explanation && (
                              <div className="grid grid-cols-[48px_1fr] gap-1 text-xs">
                                <span className="font-semibold text-muted-foreground">
                                  解释
                                </span>
                                <span className="text-[12px] text-muted-foreground">
                                  {ex.explanation}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentQuiz.hints && (
                    <div>
                      <button
                        onClick={() => setShowHint(!showHint)}
                        className="flex items-center gap-1.5 text-xs text-amber-500 transition-colors hover:text-amber-400"
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        {showHint ? "隐藏提示" : "查看提示"}
                      </button>
                      {showHint && (
                        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                          {currentQuiz.hints}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

         

          {/* ── 提交记录 ── */}
          {leftTab === "submissions" && !showPassedDetail && (
            <div className="min-h-0 flex-1 overflow-auto">
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                  <History className="h-8 w-8 opacity-20" />
                  <p className="text-sm">暂无提交记录</p>
                </div>
              ) : (
                <div>
                  {/* 表头 */}
                  <div className="flex items-center gap-2 border-b px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">
                    <span className="w-16">状态</span>
                    <span className="w-14">语言</span>
                    <span className="w-16 text-center">执行用时</span>
                    <span className="w-16 text-center">内存</span>
                    <span className="flex-1 text-right">时间</span>
                  </div>
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 border-b px-5 py-2.5 text-xs transition-colors hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "w-16 font-semibold",
                          sub.passed ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {sub.passed ? "通过" : "未通过"}
                      </span>
                      <span className="w-14 text-muted-foreground">
                        {sub.language}
                      </span>
                      <span className="w-16 text-center text-muted-foreground">
                        {sub.time != null ? `${sub.time} ms` : "N/A"}
                      </span>
                      <span className="w-16 text-center text-muted-foreground">
                        {sub.memory != null
                          ? `${(sub.memory / 1024).toFixed(1)} MB`
                          : "N/A"}
                      </span>
                      <span className="flex-1 text-right text-muted-foreground">
                        {formatDistanceToNow(new Date(sub.createAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 通过详情页 ── */}
          {showPassedDetail && submitResult && submitResult.allPassed && (
            <PassedDetail
              result={submitResult}
              contest={contest}
              onBack={() => {
                setShowPassedDetail(false);
                setLeftTab("submissions");
                fetchSubmissions();
              }}
            />
          )}
        </div>

        {/* ── 拖拽分隔栏 ── */}
        <div
          onMouseDown={handleDragStart}
          className="group flex w-1.5 flex-none cursor-col-resize items-center justify-center transition-colors hover:bg-primary/30 active:bg-primary/40"
        >
          <div className="h-8 w-0.5 rounded-full bg-border transition-colors group-hover:bg-primary/50" />
        </div>

        {/* ── 右侧：编辑器 + 判题结果 ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-r bg-card">
            <div className="flex h-11 flex-none items-center justify-between border-b bg-accent/10 px-3">
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none transition-all focus:ring-2 focus:ring-primary/30"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                  title={copied ? "已复制" : "复制代码"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleReset}
                  title="重置代码"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>

                <div className="mx-1.5 h-4 w-px bg-border" />

                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate()}
                  disabled={
                    submitMutation.isPending ||
                    !code.trim() ||
                    contest.status !== "RUNNING"
                  }
                  className="h-7 gap-1.5 px-4 text-xs font-semibold"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {contest.status !== "RUNNING" ? "比赛已结束" : "提交代码"}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                language={language === "cpp" ? "cpp" : language}
                value={code}
                onChange={(val) => setCode(val || "")}
                theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: "line",
                  lineHeight: 22,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                }}
                loading={
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              />
            </div>
          </div>

          {/* ── 判题结果面板 ── */}
          <div
            className="flex flex-none flex-col overflow-hidden rounded-b-xl border-x border-b bg-card"
            style={{ height: resultCollapsed ? 40 : resultHeight }}
          >
            {!resultCollapsed && (
              <div
                onMouseDown={handleResultDragStart}
                className="flex h-2 flex-none cursor-row-resize items-center justify-center transition-colors hover:bg-primary/20 active:bg-primary/30"
              >
                <div className="h-0.5 w-8 rounded-full bg-border" />
              </div>
            )}

            <div className="flex h-10 flex-none items-center justify-between border-b px-4">
              <div className="flex items-center gap-1">
                <span className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground">
                  判题结果
                </span>
                {submitResult && submitResult.results.length > 0 && (
                  <div className="ml-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "font-semibold",
                        submitResult.allPassed
                          ? "text-emerald-500"
                          : "text-rose-400",
                      )}
                    >
                      {submitResult.results.filter((r) => r.passed).length}/
                      {submitResult.results.length} 通过
                    </span>
                    
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setResultCollapsed(!resultCollapsed)}
              >
                {resultCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!resultCollapsed && (
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {submitMutation.isPending ? (
                  <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">正在运行测试用例...</span>
                  </div>
                ) : submitResult ? (
                  <div className="space-y-2">
                    {submitResult.allPassed && (
                      <div className="space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                        <Trophy className="mx-auto h-6 w-6 text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-500">
                          恭喜！全部通过！
                        </p>
                      </div>
                    )}

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {submitResult.results.map((r, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium",
                            r.passed
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500",
                          )}
                        >
                          {r.passed ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          <span>#{idx + 1}</span>
                        </div>
                      ))}
                    </div>

                    {submitResult.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "overflow-hidden rounded-lg border",
                          r.passed
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-rose-500/20 bg-rose-500/5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2 border-b px-3 py-1.5",
                            r.passed
                              ? "border-emerald-500/10 bg-emerald-500/10"
                              : "border-rose-500/10 bg-rose-500/10",
                          )}
                        >
                          {r.passed ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-rose-500" />
                          )}
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              r.passed ? "text-emerald-500" : "text-rose-400",
                            )}
                          >
                            用例 {idx + 1} {r.passed ? "通过" : "未通过"}
                          </span>
                        </div>
                        <div className="space-y-1.5 p-3 font-mono text-xs">
                          <div className="grid grid-cols-[36px_1fr] items-start gap-1.5">
                            <span className="font-sans text-[11px] font-medium text-muted-foreground">
                              输入
                            </span>
                            <pre className="overflow-x-auto rounded bg-background/50 px-2 py-1 text-[11px]">
                              {r.input.length > 80
                                ? r.input.slice(0, 80) + "..."
                                : r.input}
                            </pre>
                          </div>
                          <div className="grid grid-cols-[36px_1fr] items-start gap-1.5">
                            <span className="font-sans text-[11px] font-medium text-muted-foreground">
                              预期
                            </span>
                            <pre className="overflow-x-auto rounded bg-background/50 px-2 py-1 text-[11px] text-emerald-500">
                              {r.expected}
                            </pre>
                          </div>
                          <div className="grid grid-cols-[36px_1fr] items-start gap-1.5">
                            <span className="font-sans text-[11px] font-medium text-muted-foreground">
                              实际
                            </span>
                            <pre
                              className={cn(
                                "overflow-x-auto rounded bg-background/50 px-2 py-1 text-[11px]",
                                r.passed ? "text-emerald-500" : "text-rose-400",
                              )}
                            >
                              {r.actual.length > 150
                                ? r.actual.slice(0, 150) + "..."
                                : r.actual || "(空)"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Play className="h-6 w-6 opacity-20" />
                    <p className="text-xs">编写代码后点击「提交代码」</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  工具函数：渲染内联代码                                                */
/* ------------------------------------------------------------------ */

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, j) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code
        key={j}
        className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={j}>{part}</span>
    ),
  );
}
