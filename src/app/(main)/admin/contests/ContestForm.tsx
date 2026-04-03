"use client";

import { useState, useEffect } from "react";
import kyInstance from "@/lib/ky";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Quiz {
  id: string;
  title: string;
  difficulty: string;
}

interface ContestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ContestForm({ onSuccess, onCancel }: ContestFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizLoading, setQuizLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const res = await kyInstance
          .get("/api/admin/quizzes")
          .json<Quiz[]>();
        setQuizzes(res);
      } catch {
        toast({ variant: "destructive", description: "加载题目列表失败" });
      } finally {
        setQuizLoading(false);
      }
    }
    loadQuizzes();
  }, [toast]);

  function toggleQuiz(quizId: string) {
    setSelectedQuizIds((prev) =>
      prev.includes(quizId)
        ? prev.filter((id) => id !== quizId)
        : [...prev, quizId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !startTime || !endTime || !selectedQuizIds.length) {
      toast({ variant: "destructive", description: "请填写完整信息并选择题目" });
      return;
    }

    setSubmitting(true);
    try {
      await kyInstance.post("/api/admin/contests", {
        json: {
          title,
          description,
          startTime,
          endTime,
          quizIds: selectedQuizIds,
        },
      });
      toast({ description: "竞赛创建成功" });
      onSuccess();
    } catch {
      toast({ variant: "destructive", description: "创建失败" });
    } finally {
      setSubmitting(false);
    }
  }

  const difficultyColor: Record<string, string> = {
    easy: "text-green-600 bg-green-500/10",
    medium: "text-orange-500 bg-orange-500/10",
    hard: "text-red-500 bg-red-500/10",
  };

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">发布新竞赛</h2>
        <Button variant="ghost" size="sm" onClick={onCancel} className="size-8 p-0">
          <X className="size-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">竞赛标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：第 1 期周赛"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">竞赛描述（可选）</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="竞赛说明..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">开始时间</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">结束时间</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            选择题目（已选 {selectedQuizIds.length} 题）
          </label>
          {quizLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : quizzes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              暂无题目，请先在题库中添加题目
            </p>
          ) : (
            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl border p-3">
              {quizzes.map((quiz) => {
                const selected = selectedQuizIds.includes(quiz.id);
                return (
                  <button
                    key={quiz.id}
                    type="button"
                    onClick={() => toggleQuiz(quiz.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{quiz.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          difficultyColor[quiz.difficulty] || ""
                        }`}
                      >
                        {quiz.difficulty}
                      </span>
                    </div>
                    {selected && <Check className="size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            创建竞赛
          </Button>
        </div>
      </form>
    </div>
  );
}