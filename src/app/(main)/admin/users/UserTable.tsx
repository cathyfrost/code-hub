"use client";

import { useState, useEffect, useCallback } from "react";
import kyInstance from "@/lib/ky";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import {
  Search,
  Ban,
  ShieldCheck,
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

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  banned: boolean;
  points: number;
  createAt: Date;
  _count: {
    posts: number;
    comments: number;
    followers: number;
  };
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export default function UserTable() {
  const { toast } = useToast();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kyInstance
        .get("/api/admin/users", {
          searchParams: { page, search },
        })
        .json<UsersResponse>();
      setData(res);
    } catch {
      toast({ variant: "destructive", description: "加载用户列表失败" });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleBan(user: AdminUser) {
    setActionLoading(user.id);
    try {
      await kyInstance.patch(`/api/admin/users/${user.id}`, {
        json: { banned: !user.banned },
      });
      toast({
        description: user.banned
          ? `已解封 ${user.displayName}`
          : `已封禁 ${user.displayName}`,
      });
      fetchUsers();
    } catch {
      toast({ variant: "destructive", description: "操作失败" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await kyInstance.delete(`/api/admin/users/${deleteTarget.id}`);
      toast({ description: `已删除用户 ${deleteTarget.displayName}` });
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      toast({ variant: "destructive", description: "删除失败" });
    } finally {
      setActionLoading(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  }

  return (
    <>
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户名、昵称或邮箱..."
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
        ) : !data?.users.length ? (
          <p className="py-10 text-center text-muted-foreground">暂无数据</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">用户</th>
                    <th className="pb-3 pr-4 font-medium">邮箱</th>
                    <th className="pb-3 pr-4 font-medium">积分</th>
                    <th className="pb-3 pr-4 font-medium">帖子</th>
                    <th className="pb-3 pr-4 font-medium">粉丝</th>
                    <th className="pb-3 pr-4 font-medium">状态</th>
                    <th className="pb-3 pr-4 font-medium">注册时间</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            avatarUrl={u.avatarUrl}
                            size={32}
                          />
                          <div>
                            <p className="font-medium">{u.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {u.email || "-"}
                      </td>
                      <td className="py-3 pr-4">{u.points}</td>
                      <td className="py-3 pr-4">{u._count.posts}</td>
                      <td className="py-3 pr-4">{u._count.followers}</td>
                      <td className="py-3 pr-4">
                        {u.role === "ADMIN" ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            管理员
                          </span>
                        ) : u.banned ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            已封禁
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                            正常
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3 pr-4 text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelativeDate(u.createAt)}
                      </td>
                      <td className="py-3">
                        {u.role !== "ADMIN" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleBan(u)}
                              disabled={actionLoading === u.id}
                              title={u.banned ? "解封" : "封禁"}
                              className="size-8 p-0"
                            >
                              {u.banned ? (
                                <ShieldCheck className="size-4 text-green-600" />
                              ) : (
                                <Ban className="size-4 text-orange-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(u)}
                              disabled={actionLoading === u.id}
                              title="删除"
                              className="size-8 p-0"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除用户「{deleteTarget?.displayName}」及其所有数据（帖子、评论等），此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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