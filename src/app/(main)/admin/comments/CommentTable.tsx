"use client";

import { useState, useEffect, useCallback } from "react";
import kyInstance from "@/lib/ky";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
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
import Link from "next/link";

interface AdminComment {
  id: string;
  content: string;
  createAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  post: {
    id: string;
    content: string;
  };
}

interface CommentsResponse {
  comments: AdminComment[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CommentTable() {
  const { toast } = useToast();
  const [data, setData] = useState<CommentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kyInstance
        .get("/api/admin/comments", { searchParams: { page, search } })
        .json<CommentsResponse>();
      setData(res);
    } catch {
      toast({ variant: "destructive", description: "加载评论列表失败" });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await kyInstance.delete(`/api/admin/comments/${deleteTarget.id}`);
      toast({ description: "评论已删除" });
      setDeleteTarget(null);
      fetchComments();
    } catch {
      toast({ variant: "destructive", description: "删除失败" });
    } finally {
      setActionLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchComments();
  }

  return (
    <>
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索评论内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            搜索
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.comments.length ? (
          <p className="py-10 text-center text-muted-foreground">暂无数据</p>
        ) : (
          <>
            <div className="space-y-3">
              {data.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {comment.user.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{comment.user.username}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelativeDate(comment.createAt)}
                      </span>
                    </div>

                    <p className="text-sm">{comment.content.slice(0, 200)}</p>

                    <Link
                      href={`/posts/${comment.post.id}`}
                      className="line-clamp-1 text-xs text-muted-foreground hover:underline"
                    >
                      原帖：{comment.post.content.slice(0, 80)}...
                    </Link>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(comment)}
                    title="删除评论"
                    className="size-8 shrink-0 p-0"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                共 {data.total} 条，第 {data.page}/{data.totalPages} 页
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除评论？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除该评论，此操作不可撤销。
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