"use client";

import { useState, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
  Play,
  RotateCcw,
  Loader2,
  Bot,
  Copy,
  Check,
  Search,
  BookOpen,
  Zap,
  Bug,
  Share2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  HardDrive,
} from "lucide-react";

const LANGUAGES = [
  { value: "cpp", label: "C++", monacoId: "cpp", runnable: true },
  { value: "c", label: "C", monacoId: "c", runnable: true },
  { value: "javascript", label: "JavaScript", monacoId: "javascript", runnable: true },
  { value: "typescript", label: "TypeScript", monacoId: "typescript", runnable: true },
  { value: "python", label: "Python", monacoId: "python", runnable: true },
  { value: "java", label: "Java", monacoId: "java", runnable: true },
  { value: "go", label: "Go", monacoId: "go", runnable: true },
  { value: "rust", label: "Rust", monacoId: "rust", runnable: true },
  { value: "sql", label: "SQL", monacoId: "sql", runnable: true },
  { value: "html", label: "HTML", monacoId: "html", runnable: false },
  { value: "css", label: "CSS", monacoId: "css", runnable: false },
  { value: "json", label: "JSON", monacoId: "json", runnable: false },
] as const;

const DEFAULT_CODE: Record<string, string> = {
  cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << "Hello, CodeHub!" << endl;\n    \n    vector<int> nums = {1, 2, 3, 4, 5};\n    for (int n : nums) {\n        cout << n << " ";\n    }\n    cout << endl;\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, CodeHub!\\n");\n    return 0;\n}`,
  javascript: `console.log("Hello, CodeHub!");\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log("fibonacci(10) =", fibonacci(10));`,
  typescript: `const greeting: string = "Hello, CodeHub!";\nconsole.log(greeting);\n\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log("fibonacci(10) =", fibonacci(10));`,
  python: `print("Hello, CodeHub!")\n\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint(f"fibonacci(10) = {fibonacci(10)}")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeHub!");\n    }\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, CodeHub!")\n}`,
  rust: `fn main() {\n    println!("Hello, CodeHub!");\n}`,
  sql: `SELECT 'Hello, CodeHub!' AS message;`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <title>CodeHub</title>\n  <style>\n    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }\n    h1 { color: #22c55e; }\n  </style>\n</head>\n<body>\n  <h1>Hello, CodeHub!</h1>\n</body>\n</html>`,
  css: `body {\n  font-family: sans-serif;\n  background: #f0f0f0;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n}`,
  json: `{\n  "name": "CodeHub",\n  "version": "1.0.0",\n  "description": "编程学习社区"\n}`,
};

const AI_ACTIONS = [
  { value: "analyze", label: "分析代码", icon: Search },
  { value: "explain", label: "解释代码", icon: BookOpen },
  { value: "optimize", label: "优化代码", icon: Zap },
  { value: "debug", label: "调试代码", icon: Bug },
] as const;

type EditorInstance = Parameters<OnMount>[0];

export default function CodePlayground() {
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(DEFAULT_CODE["cpp"]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [activeOutput, setActiveOutput] = useState<"output" | "ai" | "preview">("output");
  const [hasError, setHasError] = useState(false);
  const [execInfo, setExecInfo] = useState<{ time?: string; memory?: number } | null>(null);
  const [outputHeight, setOutputHeight] = useState(208);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const editorRef = useRef<EditorInstance | null>(null);

  const currentLang = LANGUAGES.find((l) => l.value === language);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = outputHeight;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const handleDragMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startY.current - e.clientY;
        const newHeight = Math.min(
          Math.max(startHeight.current + delta, 80),
          window.innerHeight * 0.6,
        );
        setOutputHeight(newHeight);
      };

      const handleDragEnd = () => {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };

      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
    },
    [outputHeight],
  );

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] || "");
    setOutput("");
    setAiResult("");
    setHasError(false);
    setExecInfo(null);
  };

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput("");
    setHasError(false);
    setExecInfo(null);
    setActiveOutput("output");
    setOutputCollapsed(false);

    try {
      if (language === "html") {
        setOutput("[HTML_PREVIEW]");
        setActiveOutput("preview");
        setIsRunning(false);
        return;
      }

      if (language === "css") {
        setOutput("CSS 请配合 HTML 使用，可切换到 HTML 模式编写完整页面。");
        setIsRunning(false);
        return;
      }

      if (language === "json") {
        try {
          JSON.parse(code);
          setOutput("✓ JSON 格式正确");
        } catch (e) {
          setOutput(`JSON 格式错误: ${e instanceof Error ? e.message : "未知错误"}`);
          setHasError(true);
        }
        setIsRunning(false);
        return;
      }

      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const err = await res.json();
        setOutput(err.error || "运行失败");
        setHasError(true);
        setIsRunning(false);
        return;
      }

      const data = await res.json();
      setOutput(data.output);
      setHasError(data.isError);
      if (data.time || data.memory) {
        setExecInfo({ time: data.time, memory: data.memory });
      }
    } catch {
      setOutput("网络错误，请确认 Judge0 服务正在运行。");
      setHasError(true);
    }

    setIsRunning(false);
  }, [code, language]);

  const handleReset = () => {
    setCode(DEFAULT_CODE[language] || "");
    setOutput("");
    setAiResult("");
    setHasError(false);
    setExecInfo(null);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/```[\w]*\n?/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/\n{3,}/g, "\n\n");
  };

  const handleAIAction = async (action: string) => {
    if (!code.trim()) return;
    setAiLoading(true);
    setAiResult("");
    setActiveOutput("ai");
    setShowAI(false);
    setOutputCollapsed(false);

    try {
      const res = await fetch("/api/ai-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAiResult(`${err.error || "AI 分析失败"}`);
        return;
      }

      const data = await res.json();
      setAiResult(cleanMarkdown(data.result));
    } catch {
      setAiResult("网络错误，请稍后重试");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-0">
      {/* 编辑器 */}
      <div className="flex-1 min-h-0 rounded-xl border bg-card overflow-hidden flex flex-col">
        {/* 顶部工具栏 */}
        <div className="flex h-10 items-center justify-between border-b px-3">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title={copied ? "已复制" : "复制代码"}>
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="重置代码">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <div className="relative">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAI(!showAI)} title="AI 助手">
                <Bot className="h-3.5 w-3.5" />
              </Button>
              {showAI && (
                <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-lg border bg-card p-1 shadow-lg">
                  {AI_ACTIONS.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => handleAIAction(action.value)}
                      disabled={aiLoading}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <action.icon className="h-3.5 w-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" className="h-7 w-7" title="分享到帖子">
              <Share2 className="h-3.5 w-3.5" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button
              size="sm"
              onClick={handleRun}
              disabled={isRunning}
              className="h-7 gap-1.5 bg-primary px-3 text-xs text-primary-foreground"
            >
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              运行
            </Button>
          </div>
        </div>

        {/* Monaco */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={currentLang?.monacoId || language}
            value={code}
            onChange={(val) => setCode(val || "")}
            onMount={handleEditorMount}
            theme="light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 12 },
              renderLineHighlight: "line",
              lineHeight: 22,
            }}
            loading={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            }
          />
        </div>
      </div>

      {/* 输出面板 */}
      <div
        className="rounded-xl border bg-card overflow-hidden flex-none flex flex-col"
        style={{ height: outputCollapsed ? 40 : outputHeight }}
      >
        {/* 拖拽条 */}
        {!outputCollapsed && (
          <div
            onMouseDown={handleDragStart}
            className="h-2 cursor-row-resize hover:bg-primary/20 active:bg-primary/30 transition-colors flex items-center justify-center flex-none"
          >
            <div className="w-8 h-0.5 rounded-full bg-border" />
          </div>
        )}

        {/* 输出头部 */}
        <div className="flex h-10 items-center justify-between border-b px-4 flex-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveOutput("output")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${activeOutput === "output" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              输出
              {output && output !== "[HTML_PREVIEW]" && (
                <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${hasError ? "bg-destructive" : "bg-primary"}`} />
              )}
            </button>

            {language === "html" && output === "[HTML_PREVIEW]" && (
              <button
                onClick={() => setActiveOutput("preview")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${activeOutput === "preview" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                预览
              </button>
            )}

            {(aiResult || aiLoading) && (
              <button
                onClick={() => setActiveOutput("ai")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${activeOutput === "ai" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                AI 分析
                {aiResult && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            )}

            {execInfo && !hasError && (
              <div className="ml-3 flex items-center gap-3 text-xs text-muted-foreground">
                {execInfo.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {execInfo.time}s
                  </span>
                )}
                {execInfo.memory && (
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {(execInfo.memory / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasError && activeOutput === "output" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-orange-500 hover:text-orange-600"
                onClick={() => handleAIAction("debug")}
                disabled={aiLoading}
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI 错误分析
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOutputCollapsed(!outputCollapsed)}
            >
              {outputCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 输出内容 */}
        {!outputCollapsed && (
          <div className="flex-1 min-h-0 overflow-auto p-4">
            {activeOutput === "output" && (
              <>
                {output ? (
                  <pre className={`font-mono text-sm whitespace-pre-wrap ${hasError ? "text-destructive" : "text-foreground"}`}>
                    {output === "[HTML_PREVIEW]" ? "HTML 内容请查看「预览」标签。" : output}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">请先执行代码</p>
                )}
              </>
            )}

            {activeOutput === "preview" && language === "html" && output === "[HTML_PREVIEW]" && (
              <iframe srcDoc={code} className="h-full w-full rounded border" sandbox="allow-scripts" title="HTML Preview" />
            )}

            {activeOutput === "ai" && (
              <>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI 正在分析...</span>
                  </div>
                ) : aiResult ? (
                  <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">{aiResult}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">点击工具栏 AI 助手选择分析方式</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}