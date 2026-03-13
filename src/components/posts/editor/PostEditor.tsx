"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKi from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UserAvatar from "@/components/UserAvatar";
import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import { ImageIcon, Loader2, SendHorizonal, X } from "lucide-react";
import { ClipboardEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import "./styles.css";
import { useSubmitPostMutation } from "./mutations";
import useMediaUpload, { Attachment } from "./NewMediaUpload";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useDropzone } from "@uploadthing/react";

export default function PostEditor() {
  const { user } = useSession();
  const mutation = useSubmitPostMutation();
  const [isHovered, setIsHovered] = useState(false);
  const [flyOut, setFlyOut] = useState(false);
  const [showNew, setShowNew] = useState(false);

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
        mediaIds: attachments.map((a) => a.mediaId).filter(Boolean) as string[],
      },
      {
        onSuccess: () => {
          editor?.commands.clearContent();
          resetMediaUploads();
        },
      },
    );
  }

  function onPaste(e:ClipboardEvent<HTMLInputElement>) {
    const files = Array.from(e.clipboardData.items)
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile()) as File[];
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
            {/* 飞出去的图标 */}
            <SendHorizonal
              className={cn(
                "absolute inset-0 size-4 transition-all duration-500 ease-in",
                flyOut
                  ? "-translate-y-8 translate-x-8 scale-50 opacity-0"
                  : "translate-x-0 translate-y-0 scale-100 opacity-100",
                !flyOut && isHovered && "-translate-y-0.5 translate-x-0.5",
              )}
            />
            {/* 从下方飞入的新图标 */}
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
              flyOut ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100",
            )}
          >
            发表
          </span>
          <span
            className={cn(
              "delay-&lsqb;400ms&rsqb; absolute right-[calc(50%-10px)] transition-all duration-300",
              flyOut ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}
          >
            发表
          </span>
        </LoadingButton>
      </div>
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
