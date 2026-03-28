"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ky from "@/lib/ky";
import { NotebookData, FolderData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Download,
  Eye,
  Loader2,
  Pencil,
  Save,
  Split,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MarkdownPreview from "./MarkdownPreview";

interface NotebookEditorProps {
  notebook: NotebookData | null;
  defaultFolderId: string | null;
  onBackAction: () => void;
}

type ViewMode = "edit" | "preview" | "split";
type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function NotebookEditor({
  notebook,
  defaultFolderId,
  onBackAction,
}: NotebookEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(notebook?.title || "");
  const [content, setContent] = useState(notebook?.content || "");
  const [folderId, setFolderId] = useState<string>(
    notebook?.folderId || defaultFolderId || "none",
  );
  const [tags, setTags] = useState<string[]>(notebook?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // 用 ref 追踪最新状态，避免定时器闭包问题
  const hasChangesRef = useRef(false);
  const isSavingRef = useRef(false);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const folderIdRef = useRef(folderId);
  const tagsRef = useRef(tags);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    folderIdRef.current = folderId;
  }, [folderId]);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  const [leftWidth, setLeftWidth] = useState(50);

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
        setLeftWidth(Math.min(Math.max(newWidth, 20), 80));
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

  const { data: folders = [] } = useQuery({
    queryKey: ["notebook-folders"],
    queryFn: () => ky.get("/api/notebook-folders").json<FolderData[]>(),
  });

  // 检测是否有修改
  useEffect(() => {
    let changed: boolean;
    if (notebook) {
      changed =
        title !== notebook.title ||
        content !== notebook.content ||
        folderId !== (notebook.folderId || "none") ||
        JSON.stringify(tags) !== JSON.stringify(notebook.tags);
    } else {
      changed = title !== "" || content !== "";
    }
    setHasChanges(changed);
    hasChangesRef.current = changed;
  }, [title, content, folderId, tags, notebook]);

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      folderId: string | null;
      tags: string[];
    }) => ky.post("/api/notebooks", { json: data }).json<NotebookData>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-tags"] });
      toast({ description: "笔记创建成功" });
      onBackAction();
    },
    onError: () => {
      toast({ variant: "destructive", description: "创建失败" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      folderId: string | null;
      tags: string[];
    }) =>
      ky
        .patch(`/api/notebooks/${notebook!.id}`, { json: data })
        .json<NotebookData>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-tags"] });
      setHasChanges(false);
      hasChangesRef.current = false;
    },
    onError: () => {
      toast({ variant: "destructive", description: "保存失败" });
    },
  });

  // 核心保存函数
  const doSave = useCallback(
    async (isAutoSave = false) => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus("saving");

      const data = {
        title: titleRef.current || "无标题笔记",
        content: contentRef.current,
        folderId: folderIdRef.current === "none" ? null : folderIdRef.current,
        tags: tagsRef.current,
      };

      try {
        if (notebook) {
          await updateMutation.mutateAsync(data);
          setSaveStatus("saved");
          // 3 秒后回到 idle
          setTimeout(() => setSaveStatus("idle"), 3000);
          if (!isAutoSave) toast({ description: "已保存" });
        } else {
          await createMutation.mutateAsync(data);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } finally {
        isSavingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notebook],
  );

  // 每 10 秒检测一次，有修改则自动保存（仅对已创建的笔记）
  useEffect(() => {
    if (!notebook) return;

    const interval = setInterval(() => {
      if (hasChangesRef.current && !isSavingRef.current) {
        doSave(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [notebook, doSave]);

  // Ctrl+S 快捷键保存
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChangesRef.current || !notebook) {
          doSave(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notebook, doSave]);

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().replace(/^#/, "");
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function handleExport() {
    const mdContent = `# ${title || "无标题笔记"}\n\n${content}`;
    const blob = new Blob([mdContent], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "笔记"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "导出成功" });
  }

  const insertAtCursor = useCallback(
    (prefix: string, suffix = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      const insertion = prefix + selected + suffix;

      document.execCommand("insertText", false, insertion);

      setTimeout(() => {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + selected.length;
      }, 0);
    },
    [content],
  );

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
    }
  }

  // 保存状态指示器
  function SaveStatusIndicator() {
    switch (saveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            保存中...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
            <Cloud className="size-3" />
            已保存
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-[11px] text-destructive">
            <CloudOff className="size-3" />
            保存失败
          </span>
        );
      default:
        if (notebook && hasChanges) {
          return (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-500">
              <Pencil className="size-3" />
              未保存
            </span>
          );
        }
        if (notebook) {
          return (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
              <Check className="size-3" />
              已是最新
            </span>
          );
        }
        return null;
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-0 p-1">
      {/* 工具栏 */}
      <div className="flex h-11 flex-none items-center justify-between rounded-t-xl border border-b-0 bg-card px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onBackAction}
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">返回</span>
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <input
            placeholder="在此输入笔记标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-7 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <SaveStatusIndicator />

          <div className="mx-1 h-4 w-px bg-border" />

          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="h-7 w-28 border-none bg-accent/40 text-xs shadow-none">
              <SelectValue placeholder="文件夹" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未分类</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mx-1 h-4 w-px bg-border" />

          <div className="flex items-center rounded-lg border bg-accent/30 p-0.5">
            <button
              onClick={() => setViewMode("edit")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                viewMode === "edit"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                viewMode === "split"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Split className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
            </button>
          </div>

          <div className="mx-1 h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleExport}
            title="导出"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            onClick={() => doSave(false)}
            disabled={
              saveStatus === "saving" || (!hasChanges && !!notebook)
            }
            className="h-7 gap-1.5 px-3 text-xs font-semibold"
          >
            {saveStatus === "saving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {notebook ? "保存" : "创建"}
          </Button>
        </div>
      </div>

      {/* 标签栏 + Markdown 工具栏 */}
      <div className="flex flex-none flex-wrap items-center gap-1.5 border-x bg-card px-3 py-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-destructive"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          placeholder="添加标签…"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          className="h-5 w-20 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
        />

        {viewMode !== "preview" && (
          <>
            <div className="mx-1 h-3.5 w-px bg-border" />
            {[
              { label: "B", prefix: "**", suffix: "**" },
              { label: "I", prefix: "*", suffix: "*" },
              { label: "H1", prefix: "# ", suffix: "" },
              { label: "H2", prefix: "## ", suffix: "" },
              { label: "代码", prefix: "`", suffix: "`" },
              { label: "```", prefix: "```\n", suffix: "\n```" },
              { label: "列表", prefix: "- ", suffix: "" },
              { label: "引用", prefix: "> ", suffix: "" },
              { label: "链接", prefix: "[链接](", suffix: ")" },
              { label: "☐", prefix: "- [ ] ", suffix: "" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => insertAtCursor(item.prefix, item.suffix)}
                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* 编辑区域 */}
      <div
        className={`flex min-h-0 flex-1 gap-0 overflow-hidden rounded-b-xl border border-t-0 bg-card ${
          viewMode === "split" ? "flex-row" : "flex-col"
        }`}
      >
        {viewMode !== "preview" && (
          <div
            className="flex min-h-0 flex-col"
            style={
              viewMode === "split" ? { width: `${leftWidth}%` } : { flex: 1 }
            }
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              placeholder="在此输入 Markdown 内容..."
              className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === "split" && (
          <div
            onMouseDown={handleDragStart}
            className="group flex w-1.5 flex-none cursor-col-resize items-center justify-center transition-colors hover:bg-primary/30 active:bg-primary/40"
          >
            <div className="h-8 w-0.5 rounded-full bg-border transition-colors group-hover:bg-primary/50" />
          </div>
        )}

        {viewMode !== "edit" && (
          <div
            className="min-h-0 overflow-auto"
            style={
              viewMode === "split"
                ? { width: `${100 - leftWidth}%` }
                : { flex: 1 }
            }
          >
            <div className="p-4">
              <MarkdownPreview content={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}