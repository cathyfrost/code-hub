"use client";

import { useState, useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import ky from "@/lib/ky";
import { NotebookData, NotebooksPage, FolderData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import {
  FolderOpen,
  FolderPlus,
  Hash,
  Inbox,
  Loader2,
  NotebookPen,
  Pin,
  Plus,
  Search,

  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingButton from "@/components/LoadingButton";
import { cn } from "@/lib/utils";
import NoteActionMenu from "./NoteActionMenu";
import FolderActionMenu from "./FolderActionMenu";

interface NotebookListProps {
  onNewNoteAction: (folderId: string | null) => void;
  onSelectNoteAction: (notebook: NotebookData) => void;
}

export default function NotebookList({
  onNewNoteAction,
  onSelectNoteAction,
}: NotebookListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: folders = [] } = useQuery({
    queryKey: ["notebook-folders"],
    queryFn: () => ky.get("/api/notebook-folders").json<FolderData[]>(),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["notebook-tags"],
    queryFn: () =>
      ky.get("/api/notebook-tags").json<{ name: string; count: number }[]>(),
  });

  const queryKey = [
    "notebooks",
    selectedFolderId,
    selectedTag,
    debouncedSearch,
  ];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (selectedTag) params.set("tag", selectedTag);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return ky
        .get(`/api/notebooks?${params.toString()}`)
        .json<NotebooksPage>();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const notebooks = data?.pages.flatMap((p) => p.notebooks) || [];

  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      ky.post("/api/notebook-folders", { json: { name } }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook-folders"] });
      setNewFolderName("");
      setIsAddingFolder(false);
      toast({ description: "文件夹创建成功" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "创建失败，名称可能重复" });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      ky.patch(`/api/notebook-folders/${id}`, { json: { name } }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook-folders"] });
      setEditingFolderId(null);
      toast({ description: "重命名成功" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "重命名失败" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => ky.delete(`/api/notebook-folders/${id}`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setSelectedFolderId(null);
      toast({ description: "文件夹已删除，笔记移至未分类" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      ky.patch(`/api/notebooks/${id}`, { json: { pinned } }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ky.delete(`/api/notebooks/${id}`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-tags"] });
      toast({ description: "笔记已删除" });
    },
  });

  function handleExport(notebook: NotebookData) {
    const content = `# ${notebook.title}\n\n${notebook.content}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notebook.title || "笔记"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "导出成功" });
  }

  const activeFilterClass = "bg-primary text-primary-foreground border-primary";
  const inactiveFilterClass =
    "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground";

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-3 p-1">
      {/* 搜索 + 新建 */}
      <div className="flex flex-none items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索笔记..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-card pl-9 pr-8 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <NewNoteButton onClick={() => onNewNoteAction(selectedFolderId)} />
      </div>

      {/* 文件夹筛选 */}
      <div className="scrollbar-none flex flex-none items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setSelectedFolderId(null);
            setSelectedTag(null);
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            !selectedFolderId && !selectedTag
              ? activeFilterClass
              : inactiveFilterClass
          }`}
        >
          <Inbox className="h-3 w-3" />
          全部
        </button>
        <button
          onClick={() => {
            setSelectedFolderId("uncategorized");
            setSelectedTag(null);
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            selectedFolderId === "uncategorized"
              ? activeFilterClass
              : inactiveFilterClass
          }`}
        >
          <FolderOpen className="h-3 w-3" />
          未分类
        </button>
        {folders.map((folder) => (
          <div key={folder.id} className="group relative shrink-0">
            {editingFolderId === folder.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingName.trim()) {
                    renameFolderMutation.mutate({
                      id: folder.id,
                      name: editingName,
                    });
                  }
                }}
              >
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-7 w-24 rounded-full border bg-card px-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                  onBlur={() => setEditingFolderId(null)}
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedTag(null);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  selectedFolderId === folder.id
                    ? activeFilterClass
                    : inactiveFilterClass
                }`}
              >
                <FolderOpen className="h-3 w-3" />
                {folder.name}
                <span className="text-[10px] opacity-60">
                  {folder._count.notebooks}
                </span>
              </button>
            )}

            {editingFolderId !== folder.id && (
              <FolderActionMenu
                onRenameAction={() => {
                  setEditingFolderId(folder.id);
                  setEditingName(folder.name);
                }}
                onDeleteAction={() => deleteFolderMutation.mutate(folder.id)}
              />
            )}
          </div>
        ))}

        {isAddingFolder ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolderName.trim()) {
                createFolderMutation.mutate(newFolderName.trim());
              }
            }}
          >
            <input
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="h-7 w-24 rounded-full border bg-card px-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
              onBlur={() => {
                if (!newFolderName.trim()) setIsAddingFolder(false);
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => setIsAddingFolder(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <FolderPlus className="h-3 w-3" />
            新建
          </button>
        )}

        {tags.length > 0 && (
          <>
            <div className="mx-1 h-4 w-px shrink-0 bg-border" />
            {tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => {
                  setSelectedTag(selectedTag === tag.name ? null : tag.name);
                  setSelectedFolderId(null);
                }}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  selectedTag === tag.name
                    ? activeFilterClass
                    : inactiveFilterClass
                }`}
              >
                <Hash className="h-3 w-3" />
                {tag.name}
                <span className="text-[10px] opacity-60">{tag.count}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* 笔记列表 */}
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card">
        {status === "pending" ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notebooks.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-muted-foreground">
            <NotebookPen className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {debouncedSearch || selectedFolderId || selectedTag
                ? "没有匹配的笔记"
                : "还没有笔记，开始记录吧"}
            </p>
            <NewNoteButton onClick={() => onNewNoteAction(selectedFolderId)} />
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 grid grid-cols-[1fr_120px_100px] items-center gap-2 border-b bg-accent/30 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm md:grid-cols-[1fr_160px_120px_100px]">
              <span>标题</span>
              <span className="hidden md:block">标签</span>
              <span>文件夹</span>
              <span className="text-right">更新时间</span>
            </div>

            <InfiniteScrollContainer
              onBottomReached={() =>
                hasNextPage && !isFetching && fetchNextPage()
              }
            >
              {notebooks.map((notebook, idx) => (
                <div
                  key={notebook.id}
                  onClick={() => onSelectNoteAction(notebook)}
                  className={`group grid w-full cursor-pointer grid-cols-[1fr_120px_100px] items-center gap-2 px-4 py-3 text-left transition-all hover:bg-accent/40 md:grid-cols-[1fr_160px_120px_100px] ${
                    idx % 2 === 0 ? "" : "bg-accent/10"
                  }`}
                >
                  {/* 标题 */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {notebook.pinned && (
                        <Pin className="h-3 w-3 shrink-0 text-primary" />
                      )}
                      <span className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                        {notebook.title || "无标题笔记"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {notebook.content
                        ? notebook.content
                            .slice(0, 80)
                            .replace(/[#*`>\-\[\]]/g, "")
                        : "空笔记"}
                    </p>
                  </div>

                  {/* 标签 */}
                  <div className="hidden min-w-0 flex-wrap gap-1 md:flex">
                    {notebook.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="truncate rounded bg-accent/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                    {notebook.tags.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{notebook.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* 文件夹 */}
                  <div className="min-w-0">
                    <span className="truncate text-xs text-muted-foreground">
                      {notebook.folder?.name || "未分类"}
                    </span>
                  </div>

                  {/* 更新时间 + 操作 */}
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notebook.updateAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                    <NoteActionMenu
                      notebook={notebook}
                      onPinAction={() =>
                        pinMutation.mutate({
                          id: notebook.id,
                          pinned: !notebook.pinned,
                        })
                      }
                      onExportAction={() => handleExport(notebook)}
                      onDeleteAction={() => {
                        setDeleteTargetId(notebook.id);
                        setShowDeleteDialog(true);
                      }}
                    />
                  </div>
                </div>
              ))}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </InfiniteScrollContainer>
          </>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setDeleteTargetId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除笔记？</DialogTitle>
            <DialogDescription>
              确定要删除这篇笔记吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <LoadingButton
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteTargetId) {
                  deleteMutation.mutate(deleteTargetId, {
                    onSuccess: () => {
                      setShowDeleteDialog(false);
                      setDeleteTargetId(null);
                    },
                  });
                }
              }}
            >
              删除
            </LoadingButton>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteTargetId(null);
              }}
              disabled={deleteMutation.isPending}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewNoteButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [ripple, setRipple] = useState(false);

  function handleClick() {
    setRipple(true);
    setTimeout(() => setRipple(false), 500);
    onClick();
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative h-9 gap-1.5 overflow-hidden px-4 text-xs font-semibold transition-all duration-300 ease-out",
        "hover:shadow-md hover:brightness-110 active:scale-[0.96] active:duration-100",
        ripple && "animate-pulse",
      )}
    >
      <span
        className={cn(
          "transition-transform duration-300 ease-out",
          ripple && "scale-110",
        )}
      >
        <Plus
          className={cn(
            "h-3.5 w-3.5 transition-all duration-300",
            isHovered && "rotate-90",
          )}
        />
      </span>
      <span className="transition-all duration-200">
        {isHovered ? "开始记录" : "新建笔记"}
      </span>
    </Button>
  );
}
