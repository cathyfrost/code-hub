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
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (notebook) {
      const changed =
        title !== notebook.title ||
        content !== notebook.content ||
        folderId !== (notebook.folderId || "none") ||
        JSON.stringify(tags) !== JSON.stringify(notebook.tags);
      setHasChanges(changed);
    } else {
      setHasChanges(title !== "" || content !== "");
    }
  }, [title, content, folderId, tags, notebook]);

  useEffect(() => {
    if (!notebook || !hasChanges) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, folderId, tags]);

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
    },
    onError: () => {
      toast({ variant: "destructive", description: "保存失败" });
    },
  });

  async function handleSave(isAutoSave = false) {
    if (isSaving) return;
    setIsSaving(true);
    const data = {
      title: title || "无标题笔记",
      content,
      folderId: folderId === "none" ? null : folderId,
      tags,
    };
    try {
      if (notebook) {
        await updateMutation.mutateAsync(data);
        if (!isAutoSave) toast({ description: "已保存" });
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSaving(false);
    }
  }

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

  // 用 execCommand 插入文本，这样浏览器会自动维护 undo 栈，支持 Ctrl+Z
  const insertAtCursor = useCallback(
    (prefix: string, suffix = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      const insertion = prefix + selected + suffix;

      // 使用 document.execCommand 保留浏览器原生 undo 栈
      document.execCommand("insertText", false, insertion);

      // 选中被包裹的文字
      setTimeout(() => {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + selected.length;
      }, 0);
    },
    [content],
  );

  // 处理 Tab 键缩进（同时保留 Ctrl+Z）
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
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
            onClick={() => handleSave()}
            disabled={isSaving || (!hasChanges && !!notebook)}
            className="h-7 gap-1.5 px-3 text-xs font-semibold"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {notebook ? "保存" : "创建"}
          </Button>

          {notebook && hasChanges && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              未保存
            </span>
          )}
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
              onKeyDown={handleKeyDown}
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
