"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LoadingButton from "@/components/LoadingButton";
import {
  Bold,
  ChevronDown,
  Code,
  Coins,
  ImageIcon,
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
import { useSubmitQuestionMutation } from "../mutations";
import { useRouter } from "next/navigation";

export default function QuestionEditor() {
  const mutation = useSubmitQuestionMutation();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [bounty, setBounty] = useState(0);

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
        bold: false,
        italic: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder:
          "详细描述你遇到的编程问题、已经尝试的方法、期望的结果...",
      }),
    ],
  });

  const input = editor?.getText({ blockSeparator: "\n" }) || "";

  function onSubmit() {
    // 将标题和标签拼入 content（Post 模型没有独立的 title 字段）
    const tags = tagInput
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const fullContent = [
      title,
      tags.length > 0 ? tags.join(" ") : "",
      input,
    ]
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
            {/* 工具栏 */}
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