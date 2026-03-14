"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKi from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UserAvatar from "@/components/UserAvatar";
import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import {
  Check,
  ChevronDown,
  Code2,
  ImageIcon,
  Loader2,
  SendHorizonal,
  X,
} from "lucide-react";
import { ClipboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import "./styles.css";
import { useSubmitPostMutation } from "./mutations";
import useMediaUpload, { Attachment } from "./NewMediaUpload";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useDropzone } from "@uploadthing/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

// ── 代码插入弹窗（shadcn Dialog） ──
interface CodeInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (code: string, language: string) => void;
}

function CodeInsertDialog({
  open,
  onOpenChange,
  onInsert,
}: CodeInsertDialogProps) {
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
          {/* 语言选择 */}
          <div className="flex items-center gap-3">
            <Label>语言</Label>
            <LanguageSelector value={language} onChange={setLanguage} />
          </div>

          {/* 代码输入框 */}
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

export default function PostEditor() {
  const { user } = useSession();
  const mutation = useSubmitPostMutation();
  const [isHovered, setIsHovered] = useState(false);
  const [flyOut, setFlyOut] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);

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

  const { onClick, ...rootProps } = getRootProps();

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKi.configure({
        bold: false,
        italic: false,
      }),
      Placeholder.configure({
        placeholder: "聊一聊今天遇到的难题...",
      }),
    ],
  });

  const input =
    editor?.getText({
      blockSeparator: "\n",
    }) || "";

  function handleInsertCode(code: string, language: string) {
    if (!editor) return;
    const codeBlock = "\n```" + language + "\n" + code + "\n```";
    editor.commands.insertContent(codeBlock);
    editor.commands.focus("end");
  }

  function onSubmit() {
    setFlyOut(true);

    setTimeout(() => {
      setShowNew(true);
    }, 400);

    setTimeout(() => {
      setFlyOut(false);
      setShowNew(false);
    }, 800);

    mutation.mutate(
      {
        content: input,
        mediaIds: attachments
          .map((a) => a.mediaId)
          .filter(Boolean) as string[],
      },
      {
        onSuccess: () => {
          editor?.commands.clearContent();
          resetMediaUploads();
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

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm">
      <div className="flex gap-5">
        <UserAvatar avatarUrl={user.avatarUrl} className="hidden sm:inline" />
        <div {...rootProps} className="w-full">
          <EditorContent
            editor={editor}
            className={cn(
              "max-h-[20rem] w-full overflow-y-auto rounded-2xl bg-muted px-5 py-3",
              isDragActive && "outline-dashed",
            )}
            onPaste={onPaste}
          />
          <input {...getInputProps()} />
        </div>
      </div>
      {!!attachments.length && (
        <AttachmentPreivews
          attachments={attachments}
          removeAttachment={removeAttachment}
        />
      )}
      <div className="flex items-center justify-end gap-3">
        {isUploading && (
          <>
            <span className="text-sm">{uploadProgress ?? 0}%</span>
            <Loader2 className="size-5 animate-spin text-primary" />
          </>
        )}
        {/* 插入代码按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="text-primary hover:text-primary"
          onClick={() => setShowCodeDialog(true)}
          title="插入代码"
        >
          <Code2 size={20} />
        </Button>
        <AddAttachmentsButton
          onFilesSelected={startUpload}
          disabled={isUploading || attachments.length >= 5}
        />
        <LoadingButton
          onClick={onSubmit}
          loading={mutation.isPending}
          disabled={!input.trim() || isUploading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "relative min-w-20 gap-1.5 overflow-hidden transition-all duration-300 ease-out",
            "hover:shadow-md hover:brightness-110 active:scale-[0.96] active:duration-100",
            "disabled:hover:shadow-none disabled:hover:brightness-100",
            flyOut && "scale-[0.97]",
          )}
        >
          <span className="relative size-4">
            <SendHorizonal
              className={cn(
                "absolute inset-0 size-4 transition-all duration-500 ease-in",
                flyOut
                  ? "-translate-y-8 translate-x-8 scale-50 opacity-0"
                  : "translate-x-0 translate-y-0 scale-100 opacity-100",
                !flyOut && isHovered && "-translate-y-0.5 translate-x-0.5",
              )}
            />
            <SendHorizonal
              className={cn(
                "absolute inset-0 size-4 transition-all duration-300 ease-out",
                showNew
                  ? "translate-x-0 translate-y-0 scale-100 opacity-100"
                  : "translate-x-[-12px] translate-y-[12px] scale-50 opacity-0",
              )}
            />
          </span>
          <span
            className={cn(
              "transition-all duration-300",
              flyOut
                ? "translate-x-4 opacity-0"
                : "translate-x-0 opacity-100",
            )}
          >
            发表
          </span>
          <span
            className={cn(
              "delay-&lsqb;400ms&rsqb; absolute right-[calc(50%-10px)] transition-all duration-300",
              flyOut
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0",
            )}
          >
            发表
          </span>
        </LoadingButton>
      </div>

      {/* 代码插入弹窗 */}
      <CodeInsertDialog
        open={showCodeDialog}
        onOpenChange={setShowCodeDialog}
        onInsert={handleInsertCode}
      />
    </div>
  );
}

interface AddAttachmentsButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

function AddAttachmentsButton({
  onFilesSelected,
  disabled,
}: AddAttachmentsButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-primary hover:text-primary"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon size={20} />
      </Button>
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

interface AttachmentPreviewsProps {
  attachments: Attachment[];
  removeAttachment: (fileName: string) => void;
}

function AttachmentPreivews({
  attachments,
  removeAttachment,
}: AttachmentPreviewsProps) {
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

interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemoveClick: () => void;
}

function AttachmentPreview({
  attachment: { file, mediaId, isUploading },
  onRemoveClick,
}: AttachmentPreviewProps) {
  const src = URL.createObjectURL(file);

  return (
    <div
      className={cn("relative mx-auto size-fit", isUploading && "opacity-50")}
    >
      {file.type.startsWith("image") ? (
        <Image
          src={src}
          alt="附件预览"
          width={500}
          height={500}
          className="size-fit max-h-[30rem] rounded-2xl"
        />
      ) : (
        <video controls className="size-fit max-h-[30rem] rounded-2xl">
          <source src={src} type={file.type} />
        </video>
      )}
      {!isUploading && (
        <button
          onClick={onRemoveClick}
          className="absolute right-3 top-3 rounded-full bg-foreground p-1.5 text-background transition-colors hover:bg-foreground/60"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}