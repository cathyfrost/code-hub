"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Code2, Copy, FileCode2 } from "lucide-react";

interface CodeAttachmentData {
  code: string;
  language: string;
  fileName: string;
  lineCount: number;
}

interface CodeAttachmentProps {
  attachment: {
    codehub_code?: CodeAttachmentData;
    [key: string]: unknown;
  };
}

const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  go: "Go",
  rust: "Rust",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  json: "JSON",
};

export default function CodeAttachment({ attachment }: CodeAttachmentProps) {
  const [open, setOpen] = useState(false);
  const data = attachment.codehub_code;

  if (!data) return null;

  const langLabel = LANG_LABELS[data.language] || data.language;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-3 rounded-xl border bg-card/80 px-3 py-2 text-left transition-colors hover:bg-card"
      >
        <FileCode2 className="size-8 flex-none text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{data.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {langLabel} · {data.lineCount} 行
          </p>
        </div>
        <Code2 className="size-4 flex-none text-muted-foreground" />
      </button>

      <CodeViewerDialog
        open={open}
        onOpenChange={setOpen}
        data={data}
        langLabel={langLabel}
      />
    </>
  );
}

interface CodeViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CodeAttachmentData;
  langLabel: string;
}

function CodeViewerDialog({
  open,
  onOpenChange,
  data,
  langLabel,
}: CodeViewerDialogProps) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Code2 className="size-4 text-primary" />
            {data.fileName}
            <span className="text-xs font-normal text-muted-foreground">
              {langLabel} · {data.lineCount} 行
            </span>
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1.5"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-green-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                复制代码
              </>
            )}
          </Button>
        </DialogHeader>
        <div className="border-t">
          <Editor
            height="400px"
            language={data.language}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            value={data.code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "none",
              domReadOnly: true,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}