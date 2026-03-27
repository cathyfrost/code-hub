"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import LoadingButton from "@/components/LoadingButton";
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Code2,
  Coins,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  LinkIcon as LinkInsertIcon,
  List,
  ListOrdered,
  Loader2,
  MessageSquareQuote,
  Search,
  Unlink,
  X,
} from "lucide-react";
import { ClipboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import "@/components/posts/editor/styles.css";
import useMediaUpload, {
  Attachment,
} from "@/components/posts/editor/NewMediaUpload";
import { useDropzone } from "@uploadthing/react";
import Image from "next/image";
import { useSubmitQuestionMutation } from "../mutations";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ── HTML 转义 / 反转义工具函数（与 PostEditor 保持一致） ──
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// ── 将带换行的文本构造为 TipTap JSON 节点 ──
function textToTiptapNodes(text: string) {
  const lines = text.split("\n");
  return lines.map((line) => ({
    type: "paragraph" as const,
    content: line ? [{ type: "text" as const, text: line }] : [],
  }));
}

// ── 支持的语言列表 ──
const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "html",
  "css",
  "sql",
  "bash",
  "json",
  "text",
];

// ── 语言选择器 ──
function LanguageSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (lang: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = LANGUAGES.filter((lang) =>
    lang.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-sm transition-colors hover:bg-muted-foreground/10"
      >
        <Code2 className="size-3.5 text-primary" />
        <span>{value}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border bg-card shadow-lg">
          <div className="border-b p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索语言..."
              className="w-full rounded-md bg-muted px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                未找到匹配语言
              </p>
            ) : (
              filtered.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    onChange(lang);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    lang === value &&
                      "bg-primary/10 font-medium text-primary",
                  )}
                >
                  {lang}
                  {lang === value && (
                    <Check className="ml-auto size-3.5 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 代码插入弹窗 ──
function CodeInsertDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (code: string, language: string) => void;
}) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + "  " + code.substring(end);
      setCode(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }

  function handleInsert() {
    onInsert(code.trimEnd(), language);
    setCode("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>插入代码</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>语言</Label>
            <LanguageSelector value={language} onChange={setLanguage} />
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此输入代码...（Tab 键自动缩进）"
            className="h-64 w-full resize-none rounded-xl border bg-[#282c34] p-4 font-mono text-sm text-gray-200 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-primary"
            spellCheck={false}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <button
            disabled={!code.trim()}
            onClick={handleInsert}
            className={cn(
              "group relative inline-flex items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-300",
              "bg-primary hover:shadow-lg hover:shadow-primary/25 hover:brightness-110",
              "active:scale-95 active:shadow-none active:brightness-95 active:duration-100",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <span className="absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full" />
            <Code2 className="relative size-4 transition-transform duration-300 group-hover:rotate-12" />
            <span className="relative">插入代码</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 链接插入弹窗 ──
function LinkInsertDialog({
  open,
  onOpenChange,
  onInsert,
  onRemove,
  initialUrl,
  hasLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
  onRemove: () => void;
  initialUrl: string;
  hasLink: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (open) setUrl(initialUrl);
  }, [open, initialUrl]);

  function handleInsert() {
    if (!url.trim()) return;
    const finalUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;
    onInsert(finalUrl);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasLink ? "编辑链接" : "插入链接"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>链接地址</Label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleInsert();
                }
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            请先选中要添加链接的文本，再点击插入。
          </p>
        </div>

        <DialogFooter className="gap-2">
          {hasLink && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onRemove();
                onOpenChange(false);
              }}
              className="mr-auto gap-1.5"
            >
              <Unlink className="size-3.5" />
              移除链接
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleInsert} disabled={!url.trim()}>
            <LinkInsertIcon className="mr-1.5 size-3.5" />
            {hasLink ? "更新链接" : "插入链接"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════
// ══  QuestionEditor 主组件
// ════════════════════════════════════════

export default function QuestionEditor() {
  const mutation = useSubmitQuestionMutation();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [bounty, setBounty] = useState(0);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const {
    startUpload,
    attachments,
    isUploading,
    uploadProgress,
    removeAttachment,
    reset: resetMediaUploads,
  } = useMediaUpload();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: startUpload,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onClick: _onClick, ...rootProps } = getRootProps();

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        bold: {},
        italic: {},
        blockquote: {},
        codeBlock: false, // 用手动 ``` 插入，不用 TipTap 内置 codeBlock
        orderedList: {},
        bulletList: {},
      }),
      Placeholder.configure({
        placeholder:
          "详细描述你遇到的编程问题、已经尝试的方法、期望的结果...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
    ],
  });

  const input = editor?.getText({ blockSeparator: "\n" }) || "";

  // ── 插入代码（与 PostEditor 一致的 escape 逻辑） ──
  function handleInsertCode(code: string, language: string) {
    if (!editor) return;
    const escapedCode = escapeHtml(code);
    const codeBlock = "\n```" + language + "\n" + escapedCode + "\n```";
    const content = textToTiptapNodes(codeBlock);
    editor.commands.insertContent(content);
    editor.commands.focus("end");
  }

  // ── 插入链接 ──
  function handleInsertLink(url: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  // ── 移除链接 ──
  function handleRemoveLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  // ── 提交（反转义恢复原始代码） ──
  function onSubmit() {
    const tags = tagInput
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const rawContent = unescapeHtml(input);

    const fullContent = [title, tags.length > 0 ? tags.join(" ") : "", rawContent]
      .filter(Boolean)
      .join("\n");

    mutation.mutate(
      {
        content: fullContent,
        mediaIds: attachments
          .map((a) => a.mediaId)
          .filter(Boolean) as string[],
        bounty,
      },
      {
        onSuccess: () => {
          editor?.commands.clearContent();
          resetMediaUploads();
          setTitle("");
          setTagInput("");
          setBounty(0);
          router.push("/questions");
        },
      },
    );
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile()) as File[];
    startUpload(files);
  }

  const inputClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

  const cardClass = "rounded-lg border bg-card p-5 shadow-sm";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* 左侧主要表单区 */}
      <div className="flex-1 space-y-4">
        {/* 标题 */}
        <div className={cardClass}>
          <label className="mb-1 block text-sm font-semibold">
            标题 <span className="text-destructive">*</span>
          </label>
          <p className="mb-2 text-[12px] text-muted-foreground">
            请具体描述，想象一下您正在向另一个人提问。
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：如何在 Next.js 中实现服务端渲染 (SSR)？"
            className={inputClass}
          />
        </div>

        {/* 正文编辑器 */}
        <div className={cardClass}>
          <label className="mb-1 block text-sm font-semibold">
            问题描述 <span className="text-destructive">*</span>
          </label>
          <p className="mb-2 text-[12px] text-muted-foreground">
            包含其他人回答您的问题所需的所有信息：报错信息、已尝试的方案等。
          </p>

          <div
            className={cn(
              "overflow-hidden rounded-md border transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
              isDragActive && "border-dashed border-primary bg-primary/5",
            )}
          >
            {/* ── 工具栏 ── */}
            <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/50 px-2 py-1.5 text-muted-foreground">
              {/* 加粗：选中文本后点击切换 */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBold().run()}
                active={editor?.isActive("bold") ?? false}
                title="加粗 (Ctrl+B)"
              >
                <Bold size={15} />
              </ToolbarButton>

              {/* 斜体：选中文本后点击切换 */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                active={editor?.isActive("italic") ?? false}
                title="斜体 (Ctrl+I)"
              >
                <Italic size={15} />
              </ToolbarButton>

              <div className="mx-1 h-4 w-px bg-border" />

              {/* 链接：弹窗输入 URL */}
              <ToolbarButton
                onClick={() => setShowLinkDialog(true)}
                active={editor?.isActive("link") ?? false}
                title="插入链接"
              >
                <LinkIcon size={15} />
              </ToolbarButton>

              {/* 引用块 */}
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().toggleBlockquote().run()
                }
                active={editor?.isActive("blockquote") ?? false}
                title="引用"
              >
                <MessageSquareQuote size={15} />
              </ToolbarButton>

              {/* 代码块：弹窗选语言 + 输入代码 */}
              <ToolbarButton
                onClick={() => setShowCodeDialog(true)}
                active={false}
                title="插入代码块"
              >
                <Code size={15} />
              </ToolbarButton>

              {/* 上传图片 */}
              <AddAttachmentsButton
                onFilesSelected={startUpload}
                disabled={isUploading || attachments.length >= 5}
              />

              <div className="mx-1 h-4 w-px bg-border" />

              {/* 有序列表 */}
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
                active={editor?.isActive("orderedList") ?? false}
                title="有序列表"
              >
                <ListOrdered size={15} />
              </ToolbarButton>

              {/* 无序列表 */}
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().toggleBulletList().run()
                }
                active={editor?.isActive("bulletList") ?? false}
                title="无序列表"
              >
                <List size={15} />
              </ToolbarButton>
            </div>

            {/* ── 编辑区域 ── */}
            <div {...rootProps} className="min-h-[220px] p-0">
              <EditorContent
                editor={editor}
                className={cn(
                  "prose prose-sm max-w-none p-4 text-sm outline-none dark:prose-invert",
                  "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
                  "[&_a]:text-primary [&_a]:underline",
                  "[&_ol]:list-decimal [&_ol]:pl-6",
                  "[&_ul]:list-disc [&_ul]:pl-6",
                )}
                onPaste={onPaste}
              />
              <input {...getInputProps()} />
            </div>
          </div>

          {/* 附件预览 */}
          {!!attachments.length && (
            <div className="mt-3">
              <AttachmentPreviews
                attachments={attachments}
                removeAttachment={removeAttachment}
              />
            </div>
          )}
          {isUploading && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              上传中... {uploadProgress ?? 0}%
            </div>
          )}
        </div>

        {/* 标签 */}
        <div className={cardClass}>
          <label className="mb-1 block text-sm font-semibold">
            标签 <span className="text-destructive">*</span>
          </label>
          <p className="mb-2 text-[12px] text-muted-foreground">
            最多添加 5 个标签来描述您的问题，用空格分隔。
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="例如：javascript react next.js"
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </div>

        {/* 悬赏积分 */}
        <div className={cardClass}>
          <label className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Coins className="size-4 text-orange-500" />
            悬赏积分
            <span className="font-normal text-muted-foreground">（可选）</span>
          </label>
          <p className="mb-2 text-[12px] text-muted-foreground">
            设置悬赏积分可以吸引更多人来回答你的问题。回答被采纳后积分将转给回答者。
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={999}
              value={bounty}
              onChange={(e) =>
                setBounty(Math.max(0, parseInt(e.target.value) || 0))
              }
              className={cn(inputClass, "w-24 text-center")}
            />
            <span className="text-sm text-muted-foreground">积分</span>
            {bounty > 0 && (
              <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                发布时将预扣 {bounty} 积分
              </span>
            )}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex items-center gap-3 pt-2">
          <LoadingButton
            onClick={onSubmit}
            loading={mutation.isPending}
            disabled={!input.trim() || !title.trim() || isUploading}
            className="px-6"
          >
            发布您的问题
          </LoadingButton>
          <button
            onClick={() => router.push("/questions")}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            取消
          </button>
        </div>
      </div>

      {/* 右侧指南 */}
      <div className="hidden w-[300px] shrink-0 lg:block">
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 shadow-sm dark:border-amber-500/20 dark:bg-amber-950/20">
          <div className="border-b border-amber-500/20 p-3">
            <h2 className="text-sm font-medium text-foreground">
              起草您的问题
            </h2>
          </div>
          <div className="space-y-4 bg-card p-4">
            <p className="text-[13px] text-muted-foreground">
              社区在这里为您提供具体的编码、算法或语言问题的帮助。
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <span className="flex items-center gap-2">
                  <span className="text-primary">1.</span> 总结问题
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </div>
              <ul className="ml-5 list-disc space-y-1 text-[12px] text-muted-foreground">
                <li>包含关于您的目标的详细信息</li>
                <li>描述预期结果和实际结果</li>
                <li>包含任何错误信息</li>
              </ul>

              <div className="flex items-center justify-between pt-1 text-[13px] font-semibold">
                <span className="flex items-center gap-2">
                  <span className="text-primary">2.</span> 描述您尝试过的方法
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between pt-1 text-[13px] font-semibold">
                <span className="flex items-center gap-2">
                  <span className="text-primary">3.</span> 展示一些代码
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">提问小贴士</h3>
          <ul className="space-y-2 text-[12px] text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              标题应该是一个完整的问题句
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              提供最小可复现的代码示例
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              使用标签帮助别人找到你的问题
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              设置悬赏积分可以更快获得回答
            </li>
          </ul>
        </div>
      </div>

      {/* ── 弹窗们 ── */}
      <CodeInsertDialog
        open={showCodeDialog}
        onOpenChange={setShowCodeDialog}
        onInsert={handleInsertCode}
      />

      <LinkInsertDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        onInsert={handleInsertLink}
        onRemove={handleRemoveLink}
        initialUrl={
          (editor?.getAttributes("link").href as string | undefined) || ""
        }
        hasLink={editor?.isActive("link") ?? false}
      />
    </div>
  );
}

/* ─── 工具栏按钮（带激活高亮 + tooltip） ─── */

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors hover:bg-accent",
        active && "bg-accent text-primary",
      )}
    >
      {children}
    </button>
  );
}

/* ─── 附件相关组件 ─── */

function AddAttachmentsButton({
  onFilesSelected,
  disabled,
}: {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className="rounded p-1.5 hover:bg-accent disabled:opacity-50"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          fileInputRef.current?.click();
        }}
        title="上传图片/视频"
      >
        <ImageIcon size={15} />
      </button>
      <input
        type="file"
        accept="image/*, video/*"
        multiple
        ref={fileInputRef}
        className="sr-only hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) {
            onFilesSelected(files);
            e.target.value = "";
          }
        }}
      />
    </>
  );
}

function AttachmentPreviews({
  attachments,
  removeAttachment,
}: {
  attachments: Attachment[];
  removeAttachment: (fileName: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        attachments.length > 1 && "sm:grid sm:grid-cols-2",
      )}
    >
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.file.name}
          attachment={attachment}
          onRemoveClick={() => removeAttachment(attachment.file.name)}
        />
      ))}
    </div>
  );
}

function AttachmentPreview({
  attachment: { file, isUploading },
  onRemoveClick,
}: {
  attachment: Attachment;
  onRemoveClick: () => void;
}) {
  const src = URL.createObjectURL(file);

  return (
    <div
      className={cn("relative mx-auto size-fit", isUploading && "opacity-50")}
    >
      {file.type.startsWith("image") ? (
        <Image
          src={src}
          alt="预览"
          width={500}
          height={500}
          className="size-fit max-h-[20rem] rounded-lg border"
        />
      ) : (
        <video controls className="size-fit max-h-[20rem] rounded-lg border">
          <source src={src} type={file.type} />
        </video>
      )}
      {!isUploading && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemoveClick();
          }}
          className="absolute right-2 top-2 rounded-full bg-foreground p-1 text-background transition-colors hover:bg-foreground/60"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}