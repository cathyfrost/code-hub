"use client";

import { useState, useEffect, useCallback } from "react";
import kyInstance from "@/lib/ky";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Users,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import ContestForm from "./ContestForm";

interface ContestProblem {
  id: string;
  order: number;
  score: number;
  quiz: { id: string; title: string; difficulty: string };
}

interface AdminContest {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  status: string;
  problems: ContestProblem[];
  _count: { registrations: number; submissions: number };
  createAt: Date;
}

interface ContestsResponse {
  contests: AdminContest[];
  total: number;
  page: number;
  totalPages: number;
}

function statusLabel(status: string) {
  switch (status) {
    case "UPCOMING":
      return (
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
          未开始
        </span>
      );
    case "RUNNING":
      return (
        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
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
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContestTable() {
  const { toast } = useToast();
  const [data, setData] = useState<ContestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminContest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kyInstance
        .get("/api/admin/contests", { searchParams: { page } })
        .json<ContestsResponse>();
      setData(res);
    } catch {
      toast({ variant: "destructive", description: "加载竞赛列表失败" });
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await kyInstance.delete(`/api/admin/contests/${deleteTarget.id}`);
      toast({ description: "竞赛已删除" });
      setDeleteTarget(null);
      fetchContests();
    } catch {
      toast({ variant: "destructive", description: "删除失败" });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      {showForm ? (
        <ContestForm
          onSuccess={() => {
            setShowForm(false);
            fetchContests();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {data?.total || 0} 场竞赛
            </span>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="mr-1.5 size-4" />
              发布竞赛
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.contests.length ? (
            <p className="py-10 text-center text-muted-foreground">
              暂无竞赛
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {data.contests.map((contest) => (
                  <div
                    key={contest.id}
                    className="flex items-start justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contest.title}</span>
                        {statusLabel(contest.status)}
                      </div>

                      {contest.description && (
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {contest.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {formatDateTime(contest.startTime)} ~{" "}
                          {formatDateTime(contest.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="size-3" />
                          {contest.problems.length} 题
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {contest._count.registrations} 人报名
                        </span>
                      </div>

                      {contest.problems.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {contest.problems.map((p) => (
                            <span
                              key={p.id}
                              className="rounded-md bg-muted px-2 py-0.5 text-xs"
                            >
                              {p.quiz.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(contest)}
                      title="删除竞赛"
                      className="size-8 shrink-0 p-0"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  第 {data.page}/{data.totalPages} 页
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (data?.totalPages || 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除竞赛？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除竞赛「{deleteTarget?.title}」及相关提交记录，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}