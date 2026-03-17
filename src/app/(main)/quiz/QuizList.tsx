"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle2,
  Circle,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Target,
} from "lucide-react";
import type { QuizListItem } from "@/lib/quiz-types";

const DIFFICULTIES = [
  { value: "", label: "全部难度" },
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
] as const;

const DIFFICULTY_CONFIG = {
  easy: { label: "简单", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  medium: { label: "中等", color: "text-amber-400", bg: "bg-amber-500/10" },
  hard: { label: "困难", color: "text-rose-400", bg: "bg-rose-500/10" },
} as const;

const ALL_TAGS = [
  "数组", "字符串", "哈希表", "双指针", "栈", "链表",
  "二分查找", "排序", "数学", "递归", "动态规划", "滑动窗口",
];

const PAGE_SIZE = 15;

export default function QuizList() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (difficulty) params.set("difficulty", difficulty);
      if (selectedTag) params.set("tag", selectedTag);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/quiz?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
        setPage(1);
      }
    } catch (err) {
      console.error("获取题目列表失败:", err);
    } finally {
      setLoading(false);
    }
  }, [difficulty, selectedTag, debouncedSearch]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const totalPages = Math.ceil(quizzes.length / PAGE_SIZE);
  const pagedQuizzes = quizzes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = difficulty || selectedTag || debouncedSearch;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-3 p-1">
      {/* 搜索 + 难度筛选 */}
      <div className="flex items-center gap-2 flex-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索题目..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-card pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center rounded-lg border bg-card p-0.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(difficulty === d.value ? "" : d.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                difficulty === d.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="flex items-center gap-1.5 flex-none overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedTag("")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
            !selectedTag
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
          }`}
        >
          全部
        </button>
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
              selectedTag === tag
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 题目表格 */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border bg-card">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Target className="h-10 w-10 opacity-30" />
            <p className="text-sm">{hasFilters ? "没有匹配的题目" : "暂无题目"}</p>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDifficulty("");
                  setSelectedTag("");
                  setSearch("");
                }}
              >
                清除筛选
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 grid grid-cols-[40px_1fr_100px_80px] md:grid-cols-[48px_1fr_120px_100px_48px] items-center gap-2 border-b bg-accent/30 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <span>状态</span>
              <span>题目</span>
              <span className="hidden md:block">标签</span>
              <span className="text-center">难度</span>
              <span className="hidden md:block" />
            </div>

            {pagedQuizzes.map((quiz, idx) => (
              <button
                key={quiz.id}
                onClick={() => router.push(`/quiz/${quiz.id}`)}
                className={`group grid w-full grid-cols-[40px_1fr_100px_80px] md:grid-cols-[48px_1fr_120px_100px_48px] items-center gap-2 px-4 py-3 text-left transition-all hover:bg-accent/40 ${
                  idx % 2 === 0 ? "" : "bg-accent/10"
                }`}
              >
                <div className="flex justify-center">
                  {quiz.passed ? (
                    <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                  ) : (
                    <Circle className="h-[18px] w-[18px] text-muted-foreground/20" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-6">
                      {quiz.order}.
                    </span>
                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {quiz.title}
                    </span>
                  </div>
                </div>

                <div className="hidden md:flex flex-wrap gap-1 min-w-0">
                  {quiz.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded px-1.5 py-0.5 text-[10px] bg-accent/60 text-muted-foreground truncate"
                    >
                      {tag}
                    </span>
                  ))}
                  {quiz.tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{quiz.tags.length - 2}
                    </span>
                  )}
                </div>

                <div className="flex justify-center">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      DIFFICULTY_CONFIG[quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.color || ""
                    } ${DIFFICULTY_CONFIG[quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.bg || ""}`}
                  >
                    {DIFFICULTY_CONFIG[quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || quiz.difficulty}
                  </span>
                </div>

                <div className="hidden md:flex justify-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-none px-1">
          <span className="text-xs text-muted-foreground">共 {quizzes.length} 题</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-md text-xs font-medium transition-colors ${
                  page === p
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}