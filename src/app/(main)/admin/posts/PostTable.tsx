"use client";

import { useState, useEffect, useCallback } from "react";
import kyInstance from "@/lib/ky";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Heart,
  MessageSquare,
  Bookmark,
  Eye,
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

interface AdminPost {
  id: string;
  content: string;
  isQuestion: boolean;
  viewCount: number;
  createAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  _count: {
    likes: number;
    comments: number;
    bookmarks: number;
  };
}

interface PostsResponse {
  posts: AdminPost[];
  total: number;
  page: number;
  totalPages: number;
}

export default function PostTable() {
  const { toast } = useToast();
  const [data, setData] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminPost | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kyInstance
        .get("/api/admin/posts", { searchParams: { page, search } })
        .json<PostsResponse>();
      setData(res);
    } catch {
      toast({ variant: "destructive", description: "加载帖子列表失败" });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await kyInstance.delete(`/api/admin/posts/${deleteTarget.id}`);
      toast({ description: "帖子已删除" });
      setDeleteTarget(null);
      fetchPosts();
    } catch {
      toast({ variant: "destructive", description: "删除失败" });
    } finally {
      setActionLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  }

  return (
    <>
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索帖子内容..."
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
        ) : !data?.posts.length ? (
          <p className="py-10 text-center text-muted-foreground">暂无数据</p>
        ) : (
          <>
            <div className="space-y-3">
              {data.posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        avatarUrl={post.user.avatarUrl}
                        size={24}
                      />
                      <span className="text-sm font-medium">
                        {post.user.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{post.user.username}
                      </span>
                      {post.isQuestion && (
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
                          问答
                        </span>
                      )}
                      <span
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelativeDate(post.createAt)}
                      </span>
                    </div>

                    <Link
                      href={`/posts/${post.id}`}
                      className="line-clamp-2 text-sm hover:underline"
                    >
                      {post.content.slice(0, 200)}
                    </Link>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="size-3" /> {post._count.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" />{" "}
                        {post._count.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="size-3" /> {post._count.bookmarks}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" /> {post.viewCount}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(post)}
                    title="删除帖子"
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
            <AlertDialogTitle>确认删除帖子？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除该帖子及其所有评论，此操作不可撤销。
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