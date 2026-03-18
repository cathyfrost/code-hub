import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code2, Loader2 } from "lucide-react";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
];

interface CodeSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: {
    code: string;
    language: string;
    fileName: string;
  }) => void;
  sending?: boolean;
}

export default function CodeSendDialog({
  open,
  onOpenChange,
  onSend,
  sending,
}: CodeSendDialogProps) {
  const { resolvedTheme } = useTheme();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [fileName, setFileName] = useState("");

  const langLabel =
    LANGUAGES.find((l) => l.value === language)?.label || language;

  const lineCount = code.split("\n").length;

  const handleSend = () => {
    if (!code.trim()) return;
    const name = fileName.trim() || `code.${getExtension(language)}`;
    onSend({ code, language, fileName: name });
    // 重置
    setCode("");
    setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="size-5 text-primary" />
            发送代码
          </DialogTitle>
        </DialogHeader>

        {/* 工具栏 */}
        <div className="flex items-center gap-3 px-5">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={`文件名（可选，默认 code.${getExtension(language)}）`}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* 编辑器 */}
        <div className="border-y">
          <Editor
            height="300px"
            language={language}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            value={code}
            onChange={(v) => setCode(v || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "none",
            }}
          />
        </div>

        {/* 底部 */}
        <DialogFooter className="flex items-center justify-between px-5 pb-5">
          <span className="text-xs text-muted-foreground">
            {langLabel} · {lineCount} 行
          </span>
          <Button
            onClick={handleSend}
            disabled={!code.trim() || sending}
            size="sm"
          >
            {sending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Code2 className="mr-2 size-4" />
            )}
            发送代码
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getExtension(language: string): string {
  const map: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rust: "rs",
    html: "html",
    css: "css",
    sql: "sql",
    json: "json",
  };
  return map[language] || "txt";
}