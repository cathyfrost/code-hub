"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Check,
  Lightbulb,
  Trophy,
  HardDrive,
  LogOut,
  Swords,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";

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
/*  类型                                                               */
/* ------------------------------------------------------------------ */

interface PlayerInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SubmissionRecord {
  id: string;
  userId: string;
  passed: boolean;
  language: string;
  time: number | null;
  memory: number | null;
  createAt: string;
}

interface QuizInfo {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{ input: string; expectedOutput: string }>;
  starterCode: Record<string, string>;
  hints: string | null;
  tags: string[];
}

interface ChallengeDetail {
  id: string;
  difficulty: string;
  status: "MATCHING" | "ONGOING" | "FINISHED" | "CANCELLED";
  timeLimit: number;
  winnerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  challengerId: string;
  challenger: PlayerInfo;
  opponentId: string | null;
  opponent: PlayerInfo | null;
  quiz: QuizInfo | null;
  submissions: SubmissionRecord[];
}

interface SubmitResult {
  results: Array<{
    index: number;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    time: string | null;
    memory: number | null;
  }>;
  allPassed: boolean;
  passedCount: number;
  totalCases: number;
}

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
/*  主组件                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  challengeId: string;
}

export default function ChallengeArena({ challengeId }: Props) {
  const { user } = useSession();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  const [leftWidth, setLeftWidth] = useState(42);
  const [resultHeight, setResultHeight] = useState(224);
  const [resultCollapsed, setResultCollapsed] = useState(false);
  const isDraggingResult = useRef(false);
  const resultStartY = useRef(0);
  const resultStartH = useRef(0);

  const [timeLeft, setTimeLeft] = useState("");

  /* ------ 获取对战数据 + 轮询 ------ */
  const fetchChallenge = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenge/${challengeId}`);
      if (!res.ok) {
        setError("对战不存在或无权限");
        return;
      }
      const data: ChallengeDetail = await res.json();
      setChallenge(data);

      // 首次加载时设置初始代码
      if (!code && data.quiz) {
        const starter = data.quiz.starterCode as Record<string, string>;
        setCode(starter?.["cpp"] || "");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [challengeId, code]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // 轮询对战状态（每 3 秒）
  useEffect(() => {
    if (!challenge || challenge.status === "FINISHED" || challenge.status === "CANCELLED") return;

    const interval = setInterval(fetchChallenge, 3000);
    return () => clearInterval(interval);
  }, [challenge?.status, fetchChallenge]);

  /* ------ 倒计时 ------ */
  useEffect(() => {
    if (!challenge?.startedAt || challenge.status !== "ONGOING") return;

    const timer = setInterval(() => {
      const start = new Date(challenge.startedAt!).getTime();
      const elapsed = (Date.now() - start) / 1000;
      const remaining = challenge.timeLimit - elapsed;

      if (remaining <= 0) {
        setTimeLeft("00:00");
        clearInterval(timer);
        fetchChallenge(); // 触发后端超时结算
        return;
      }

      const m = Math.floor(remaining / 60);
      const s = Math.floor(remaining % 60);
      setTimeLeft(
        `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [challenge?.startedAt, challenge?.timeLimit, challenge?.status, fetchChallenge]);

  /* ------ 语言切换 ------ */
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (challenge?.quiz) {
      const starter = challenge.quiz.starterCode as Record<string, string>;
      setCode(starter?.[lang] || "");
    }
    setSubmitResult(null);
  };

  /* ------ 复制 ------ */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ------ 提交代码 ------ */
  const handleSubmit = useCallback(async () => {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setSubmitResult(null);
    setResultCollapsed(false);

    try {
      const res = await fetch(`/api/challenge/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSubmitResult({
          results: [],
          allPassed: false,
          passedCount: 0,
          totalCases: 0,
        });
        setError(err.error || "提交失败");
        return;
      }

      const data: SubmitResult = await res.json();
      setSubmitResult(data);
      fetchChallenge(); // 刷新对战状态
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }, [code, language, challengeId, submitting, fetchChallenge]);

  /* ------ 放弃比赛 ------ */
  const handleForfeit = async () => {
    try {
      await fetch(`/api/challenge/${challengeId}`, { method: "PUT" });
      fetchChallenge();
      setShowForfeitConfirm(false);
    } catch {}
  };

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

  /* ------ 加载/错误状态 ------ */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center gap-3">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.push("/contest")}>
          返回竞赛
        </Button>
      </div>
    );
  }

  if (!challenge || !challenge.quiz) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center text-muted-foreground">
        等待分配题目...
      </div>
    );
  }

  /* ------ 计算对手状态 ------ */
  const opponent =
    challenge.challengerId === user.id
      ? challenge.opponent
      : challenge.challenger;
  const mySubmissions = challenge.submissions.filter(
    (s) => s.userId === user.id,
  );
  const opponentSubmissions = challenge.submissions.filter(
    (s) => s.userId !== user.id,
  );
  const myPassed = mySubmissions.some((s) => s.passed);
  const opponentPassed = opponentSubmissions.some((s) => s.passed);
  const isFinished = challenge.status === "FINISHED";
  const isWinner = challenge.winnerId === user.id;
  const isLoser = challenge.winnerId && challenge.winnerId !== user.id;

  const quiz = challenge.quiz;
  const examples = quiz.examples as Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  const diffConfig = DIFFICULTY_STYLE[quiz.difficulty];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-0">
      {/* ====== 顶部对战状态栏 ====== */}
      <div className="flex h-12 flex-none items-center justify-between rounded-t-xl border bg-card px-4">
        {/* 左：返回 */}
        <button
          onClick={() => router.push("/contest")}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">竞赛</span>
        </button>

        {/* 中：VS 信息 */}
        <div className="flex items-center gap-4">
          {/* 自己 */}
          <div className="flex items-center gap-2">
            <UserAvatar avatarUrl={user.avatarUrl} size={28} />
            <div className="text-right">
              <div className="text-xs font-medium">{user.displayName}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {myPassed ? (
                  <span className="flex items-center gap-0.5 text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" />
                    已通过
                  </span>
                ) : (
                  <span>提交 {mySubmissions.length} 次</span>
                )}
              </div>
            </div>
          </div>

          {/* VS + 倒计时 */}
          <div className="flex flex-col items-center">
            {isFinished ? (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-bold",
                  isWinner && "text-emerald-500",
                  isLoser && "text-rose-500",
                  !challenge.winnerId && "text-muted-foreground",
                )}
              >
                {isWinner && (
                  <>
                    <Trophy className="h-4 w-4" />
                    胜利
                  </>
                )}
                {isLoser && "失败"}
                {!challenge.winnerId && "平局"}
              </div>
            ) : (
              <Swords className="h-4 w-4 text-primary" />
            )}
            {challenge.status === "ONGOING" && timeLeft && (
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  parseInt(timeLeft) <= 1
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {timeLeft}
              </span>
            )}
          </div>

          {/* 对手 */}
          <div className="flex items-center gap-2">
            <div>
              <div className="text-xs font-medium">
                {opponent?.displayName || "等待中"}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {opponentPassed ? (
                  <span className="flex items-center gap-0.5 text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" />
                    已通过
                  </span>
                ) : (
                  <span>提交 {opponentSubmissions.length} 次</span>
                )}
              </div>
            </div>
            {opponent ? (
              <UserAvatar avatarUrl={opponent.avatarUrl} size={28} />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* 右：放弃按钮 */}
        <div>
          {challenge.status === "ONGOING" && (
            <>
              {showForfeitConfirm ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-destructive">确定放弃？</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={handleForfeit}
                  >
                    确定
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setShowForfeitConfirm(false)}
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowForfeitConfirm(true)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                >
                  <LogOut className="h-3 w-3" />
                  放弃
                </button>
              )}
            </>
          )}
          {isFinished && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => router.push("/contest")}
            >
              返回
            </Button>
          )}
        </div>
      </div>

      {/* ====== 主体：左右分栏 ====== */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* ── 左侧：题目描述 ── */}
        <div
          className="flex min-h-0 flex-col overflow-hidden border-x border-b bg-card"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="flex h-11 flex-none items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">
                {quiz.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${diffConfig?.color} ${diffConfig?.bg}`}
              >
                {diffConfig?.label || quiz.difficulty}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-5 p-5">
              {quiz.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quiz.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {quiz.description.split("\n").map((line, i) => {
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

              {quiz.hints && (
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
                      {quiz.hints}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 拖拽分隔栏 ── */}
        <div
          onMouseDown={handleDragStart}
          className="group flex w-1.5 flex-none cursor-col-resize items-center justify-center transition-colors hover:bg-primary/30 active:bg-primary/40"
        >
          <div className="h-8 w-0.5 rounded-full bg-border transition-colors group-hover:bg-primary/50" />
        </div>

        {/* ── 右侧：编辑器 + 判题结果 ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-r bg-card">
            {/* 工具栏 */}
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

                <div className="mx-1.5 h-4 w-px bg-border" />

                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting || !code.trim() || isFinished || myPassed}
                  className="h-7 gap-1.5 px-4 text-xs font-semibold"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {myPassed ? "已通过" : isFinished ? "已结束" : "提交判题"}
                </Button>
              </div>
            </div>

            {/* Monaco Editor */}
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
                  readOnly: isFinished,
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
                {submitResult && submitResult.totalCases > 0 && (
                  <div className="ml-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "font-semibold",
                        submitResult.allPassed
                          ? "text-emerald-500"
                          : "text-rose-400",
                      )}
                    >
                      {submitResult.passedCount}/{submitResult.totalCases} 通过
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
                {/* 对战结束弹窗 */}
                {isFinished && (
                  <div
                    className={cn(
                      "mb-3 space-y-1 rounded-lg border p-4 text-center",
                      isWinner
                        ? "border-emerald-500/20 bg-emerald-500/10"
                        : isLoser
                          ? "border-rose-500/20 bg-rose-500/10"
                          : "border-border bg-muted/50",
                    )}
                  >
                    {isWinner && (
                      <>
                        <Trophy className="mx-auto h-6 w-6 text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-500">
                          恭喜你赢得了对战！
                        </p>
                      </>
                    )}
                    {isLoser && (
                      <p className="text-sm font-semibold text-rose-400">
                        很遗憾，对手赢了这场对战
                      </p>
                    )}
                    {!challenge.winnerId && (
                      <p className="text-sm font-semibold text-muted-foreground">
                        平局，双方均未在规定时间内解出
                      </p>
                    )}
                  </div>
                )}

                {submitting ? (
                  <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">正在运行测试用例...</span>
                  </div>
                ) : submitResult && submitResult.results.length > 0 ? (
                  <div className="space-y-2">
                    {submitResult.allPassed && (
                      <div className="space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                        <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-500">
                          全部通过！等待对手完成...
                        </p>
                      </div>
                    )}

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {submitResult.results.map((r) => (
                        <div
                          key={r.index}
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
                          <span>#{r.index + 1}</span>
                          {r.time && (
                            <span className="ml-1 text-[10px] opacity-60">
                              {r.time}s
                            </span>
                          )}
                          {r.memory && (
                            <span className="text-[10px] opacity-60">
                              {(r.memory / 1024).toFixed(1)}MB
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {submitResult.results.map((r) => (
                      <div
                        key={r.index}
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
                            用例 {r.index + 1} {r.passed ? "通过" : "未通过"}
                          </span>
                          <div
                            className={cn(
                              "ml-auto flex items-center gap-2 text-[10px]",
                              r.passed
                                ? "text-emerald-500/50"
                                : "text-rose-400/50",
                            )}
                          >
                            {r.time && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {r.time}s
                              </span>
                            )}
                            {r.memory && (
                              <span className="flex items-center gap-0.5">
                                <HardDrive className="h-3 w-3" />
                                {(r.memory / 1024).toFixed(1)}MB
                              </span>
                            )}
                          </div>
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
                  !isFinished && (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                      <Play className="h-6 w-6 opacity-20" />
                      <p className="text-xs">编写代码后点击「提交判题」</p>
                    </div>
                  )
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