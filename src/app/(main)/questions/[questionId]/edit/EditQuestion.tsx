"use client";

import { PostData } from "@/lib/types";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LoadingButton from "@/components/LoadingButton";
import {
  Bold,
  Code,
  ImageIcon,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  MessageSquareQuote,
  Search,
  X,
} from "lucide-react";
import { ClipboardEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import "@/components/posts/editor/styles.css";
import useMediaUpload, {
  Attachment,
} from "@/components/posts/editor/NewMediaUpload";
import { useDropzone } from "@uploadthing/react";
import Image from "next/image";
import { useUpdateQuestionMutation } from "../../mutations";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EditQuestionProps {
  post: PostData;
}

/**
 * 从 post.content 解析出标题、标签文本、正文
 */
function parseContent(content: string) {
  const codeBlocks: string[] = [];
  const shielded = content.replace(/```\w*\n[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\u0000CB${codeBlocks.length - 1}\u0000`;
  });

  const lines = shielded.split("\n");

  // 标题 = 第一行非空文本（去 #tag）
  const titleIdx = lines.findIndex((l) => l.trim());
  const titleRaw = titleIdx >= 0 ? lines[titleIdx] : "";
  const title = titleRaw.replace(/#[^\s#]+/g, "").trim();

  // 提取所有 #tag
  const tagMatches = shielded.match(/#[^\s#<>{};()]+/g) || [];
  const tags = [...new Set(tagMatches.map((t) => t.replace(/^#/, "")))];

  // 正文 = 去掉标题行 + 去掉 #tag + 还原代码块
  const bodyLines = [...lines];
  if (titleIdx >= 0) bodyLines[titleIdx] = "";
  let body = bodyLines.join("\n");
  body = body.replace(/#[^\s#<>{};()]+/g, "");
  body = body.replace(/\u0000CB(\d+)\u0000/g, (_, i) => codeBlocks[+i]);
  body = body.replace(/\n{3,}/g, "\n\n").trim();

  return { title, tags: tags.join(" "), body };
}

export default function EditQuestion({ post }: EditQuestionProps) {
  const router = useRouter();
  const mutation = useUpdateQuestionMutation();

  const parsed = parseContent(post.content);

  const [title, setTitle] = useState(parsed.title);
  const [tagInput, setTagInput] = useState(parsed.tags);

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

  const { onClick: _onClick, ...rootProps } = getRootProps();

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "详细描述你遇到的编程问题...",
      }),
    ],
    content: {
      type: "doc",
      content: parsed.body
        .split("\n")
        .map((line) => ({
          type: "paragraph" as const,
          content: line ? [{ type: "text" as const, text: line }] : [],
        })),
    },
  });

  const input = editor?.getText({ blockSeparator: "\n" }) || "";

  // 已有的附件（从 post 中来）
  const existingMediaIds = post.attachments.map((a) => a.id);

  function onSubmit() {
    const tags = tagInput
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const fullContent = [title, tags.length > 0 ? tags.join(" ") : "", input]
      .filter(Boolean)
      .join("\n");

    const newMediaIds = attachments
      .map((a) => a.mediaId)
      .filter(Boolean) as string[];

    mutation.mutate({
      postId: post.id,
      content: fullContent,
      mediaIds: [...existingMediaIds, ...newMediaIds],
    });
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
    <div className="space-y-5">
      {/* SO 风格顶部审核提示 */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
          <Info className="size-4 text-amber-600 dark:text-amber-400" />
          您的编辑将被提交并立即生效
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          我们欢迎能让帖子更容易理解、对读者更有价值的编辑。请尽量让帖子比你发现时更好——例如修正语法、补充相关资源和链接、完善代码格式等。
        </p>
      </div>

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
          包含其他人回答您的问题所需的所有信息。
        </p>

        <div
          className={cn(
            "overflow-hidden rounded-md border transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            isDragActive && "border-dashed border-primary bg-primary/5",
          )}
        >
          <div className="flex items-center gap-0.5 border-b bg-muted/50 px-2 py-1.5 text-muted-foreground">
            <button className="rounded p-1.5 hover:bg-accent">
              <Bold size={15} />
            </button>
            <button className="rounded p-1.5 hover:bg-accent">
              <Italic size={15} />
            </button>
            <div className="mx-1 h-4 w-px bg-border" />
            <button className="rounded p-1.5 hover:bg-accent">
              <LinkIcon size={15} />
            </button>
            <button className="rounded p-1.5 hover:bg-accent">
              <MessageSquareQuote size={15} />
            </button>
            <button className="rounded p-1.5 hover:bg-accent">
              <Code size={15} />
            </button>
            <AddAttachmentsButton
              onFilesSelected={startUpload}
              disabled={isUploading || attachments.length >= 5}
            />
            <div className="mx-1 h-4 w-px bg-border" />
            <button className="rounded p-1.5 hover:bg-accent">
              <ListOrdered size={15} />
            </button>
            <button className="rounded p-1.5 hover:bg-accent">
              <List size={15} />
            </button>
          </div>

          <div {...rootProps} className="min-h-[220px] p-0">
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none p-4 text-sm outline-none dark:prose-invert"
              onPaste={onPaste}
            />
            <input {...getInputProps()} />
          </div>
        </div>

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
        <label className="mb-1 block text-sm font-semibold">标签</label>
        <p className="mb-2 text-[12px] text-muted-foreground">
          用空格分隔标签，帮助别人找到你的问题。
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
        {/* 当前标签预览 */}
        {tagInput.trim() && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagInput
              .split(/[\s,]+/)
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-[4px] bg-sky-500/10 px-2 py-0.5 text-[12px] text-sky-700 dark:bg-sky-400/10 dark:text-sky-400"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                  <button
                    onClick={() => {
                      setTagInput((prev) =>
                        prev
                          .split(/[\s,]+/)
                          .filter((t) => t !== tag)
                          .join(" "),
                      );
                    }}
                    className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-sky-500/20"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* 提交 */}
      <div className="flex items-center gap-3 pt-1">
        <LoadingButton
          onClick={onSubmit}
          loading={mutation.isPending}
          disabled={!input.trim() || !title.trim() || isUploading}
          className="px-6"
        >
          保存编辑
        </LoadingButton>
        <Link
          href={`/questions/${post.id}`}
          className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          取消
        </Link>
      </div>
    </div>
  );
}

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
        className="rounded p-1.5 hover:bg-accent disabled:opacity-50"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          fileInputRef.current?.click();
        }}
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