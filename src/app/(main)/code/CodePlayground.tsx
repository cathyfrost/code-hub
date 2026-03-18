"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  MessageSquare,
  FileEdit,
  PenTool,
  X,
  Terminal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

/* ------------------------------------------------------------------ */
/*  动态加载 Excalidraw（避免 SSR）                                     */
/* ------------------------------------------------------------------ */

const ExcalidrawCanvas = dynamic(
  () =>
    import("@excalidraw/excalidraw").then((mod) => {
      import("@excalidraw/excalidraw/index.css");
      const { Excalidraw } = mod;
      function ExcalidrawWrapper(props: {
        theme: "light" | "dark";
        onAPI: (api: unknown) => void;
      }) {
        return (
          <Excalidraw
            excalidrawAPI={props.onAPI}
            theme={props.theme}
            langCode="zh-CN"
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
              },
            }}
          />
        );
      }
      ExcalidrawWrapper.displayName = "ExcalidrawWrapper";
      return ExcalidrawWrapper;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  },
);

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { value: "cpp", label: "C++", monacoId: "cpp", runnable: true },
  { value: "c", label: "C", monacoId: "c", runnable: true },
  {
    value: "javascript",
    label: "JavaScript",
    monacoId: "javascript",
    runnable: true,
  },
  {
    value: "typescript",
    label: "TypeScript",
    monacoId: "typescript",
    runnable: true,
  },
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

/* ------------------------------------------------------------------ */
/*  组件                                                               */
/* ------------------------------------------------------------------ */

export default function CodePlayground() {
  const { resolvedTheme: appTheme } = useTheme();
  const router = useRouter();

  // 编辑器状态
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(DEFAULT_CODE["cpp"]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [activeOutput, setActiveOutput] = useState<"output" | "ai" | "preview">("output");
  const [hasError, setHasError] = useState(false);
  const [execInfo, setExecInfo] = useState<{
    time?: string;
    memory?: number;
  } | null>(null);
  const [outputHeight, setOutputHeight] = useState(208);
  const editorRef = useRef<EditorInstance | null>(null);

  // stdin 状态
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(true);

  // 输出面板拖拽
  const isDraggingOutput = useRef(false);
  const outputStartY = useRef(0);
  const outputStartH = useRef(0);

  // 画板状态
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(480);
  const isDraggingCanvas = useRef(false);
  const canvasStartX = useRef(0);
  const canvasStartW = useRef(0);

  const currentLang = LANGUAGES.find((l) => l.value === language);

  /* ------ 输出面板拖拽 ------ */
  const handleOutputDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDraggingOutput.current = true;
      outputStartY.current = e.clientY;
      outputStartH.current = outputHeight;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: MouseEvent) => {
        if (!isDraggingOutput.current) return;
        const delta = outputStartY.current - e.clientY;
        setOutputHeight(
          Math.min(
            Math.max(outputStartH.current + delta, 80),
            window.innerHeight * 0.6,
          ),
        );
      };

      const onUp = () => {
        isDraggingOutput.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [outputHeight],
  );

  /* ------ 画板拖拽调宽 ------ */
  const handleCanvasDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingCanvas.current = true;
      canvasStartX.current = e.clientX;
      canvasStartW.current = canvasWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: MouseEvent) => {
        if (!isDraggingCanvas.current) return;
        const delta = canvasStartX.current - e.clientX;
        setCanvasWidth(
          Math.min(
            Math.max(canvasStartW.current + delta, 280),
            window.innerWidth * 0.7,
          ),
        );
      };

      const onUp = () => {
        isDraggingCanvas.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [canvasWidth],
  );

  /* ------ Monaco 自适应 ------ */
  useEffect(() => {
    const timer = setTimeout(() => {
      editorRef.current?.layout();
    }, 50);
    return () => clearTimeout(timer);
  }, [canvasOpen, canvasWidth]);

  /* ------ 编辑器事件 ------ */
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
          setOutput(
            `JSON 格式错误: ${e instanceof Error ? e.message : "未知错误"}`,
          );
          setHasError(true);
        }
        setIsRunning(false);
        return;
      }

      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, stdin]);

  const handleReset = () => {
    setCode(DEFAULT_CODE[language] || "");
    setOutput("");
    setAiResult("");
    setHasError(false);
    setExecInfo(null);
    setStdin("");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanMarkdown = (text: string) =>
    text
      .replace(/```[\w]*\n?/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/\n{3,}/g, "\n\n");

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
        body: JSON.stringify({
          code,
          language,
          action,
          errorOutput: action === "debug" && hasError ? output : undefined,
        }),
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

  /* ---------------------------------------------------------------- */
  /*  渲染                                                             */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0">
      {/* ====== 左侧：代码编辑器 + 输出 ====== */}
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        {/* 编辑器 */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          {/* 顶部工具栏 */}
          <div className="flex h-10 flex-none items-center justify-between border-b px-3">
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
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title={copied ? "已复制" : "复制代码"}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleReset}
                title="重置代码"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              {/* 画板按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${canvasOpen ? "bg-accent" : ""}`}
                onClick={() => setCanvasOpen(!canvasOpen)}
                title={canvasOpen ? "关闭画板" : "打开画板"}
              >
                <PenTool className="h-3.5 w-3.5" />
              </Button>

              {/* stdin 按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${showStdin ? "bg-accent" : ""}`}
                onClick={() => setShowStdin(!showStdin)}
                title="标准输入 (stdin)"
              >
                <Terminal className="h-3.5 w-3.5" />
              </Button>

              {/* AI 助手 */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowAI(!showAI)}
                  title="AI 助手"
                >
                  <Bot className="h-3.5 w-3.5" />
                </Button>
                {showAI && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-36 animate-in fade-in-0 zoom-in-95 rounded-xl border bg-popover p-1.5 shadow-md">
                    {AI_ACTIONS.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleAIAction(action.value)}
                        disabled={aiLoading}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <action.icon className="h-3.5 w-3.5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 分享 */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowShare(!showShare)}
                  title="分享代码"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                {showShare && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-36 animate-in fade-in-0 zoom-in-95 rounded-xl border bg-popover p-1.5 shadow-md">
                    <button
                      onClick={() => {
                        setShowShare(false);
                        const encoded = encodeURIComponent(code);
                        router.push(`/?code=${encoded}&lang=${language}`);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                      分享到帖子
                    </button>
                    <button
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      分享到聊天室
                      <span className="ml-auto text-[10px]">即将上线</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="mx-1 h-4 w-px bg-border" />

              <Button
                size="sm"
                onClick={handleRun}
                disabled={isRunning}
                className="h-7 gap-1.5 bg-primary px-3 text-xs text-primary-foreground"
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                运行
              </Button>
            </div>
          </div>

          {/* stdin 输入区 */}
          {showStdin && (
            <div className="flex-none border-b px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  标准输入 (stdin)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => {
                    setShowStdin(false);
                    setStdin("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="程序运行时的输入内容，每行一个..."
                className="w-full resize-y rounded-md border bg-background px-2 py-1.5 font-mono text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                rows={3}
              />
            </div>
          )}

          {/* Monaco */}
          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              language={currentLang?.monacoId || language}
              value={code}
              onChange={(val) => setCode(val || "")}
              onMount={handleEditorMount}
              theme={appTheme === "dark" ? "vs-dark" : "light"}
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
          className="flex flex-none flex-col overflow-hidden rounded-xl border bg-card"
          style={{ height: outputCollapsed ? 40 : outputHeight }}
        >
          {!outputCollapsed && (
            <div
              onMouseDown={handleOutputDragStart}
              className="flex h-2 flex-none cursor-row-resize items-center justify-center transition-colors hover:bg-primary/20 active:bg-primary/30"
            >
              <div className="h-0.5 w-8 rounded-full bg-border" />
            </div>
          )}

          <div className="flex h-10 flex-none items-center justify-between border-b px-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveOutput("output")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${activeOutput === "output" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                输出
                {output && output !== "[HTML_PREVIEW]" && (
                  <span
                    className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${hasError ? "bg-destructive" : "bg-primary"}`}
                  />
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
                  {aiResult && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
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
                  {aiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI 错误分析
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOutputCollapsed(!outputCollapsed)}
              >
                {outputCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {!outputCollapsed && (
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {activeOutput === "output" && (
                <>
                  {output ? (
                    <pre
                      className={`whitespace-pre-wrap font-mono text-sm ${hasError ? "text-destructive" : "text-foreground"}`}
                    >
                      {output === "[HTML_PREVIEW]"
                        ? "HTML 内容请查看「预览」标签。"
                        : output}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      请先执行代码
                    </p>
                  )}
                </>
              )}

              {activeOutput === "preview" &&
                language === "html" &&
                output === "[HTML_PREVIEW]" && (
                  <iframe
                    srcDoc={code}
                    className="h-full w-full rounded border"
                    sandbox="allow-scripts"
                    title="HTML Preview"
                  />
                )}

              {activeOutput === "ai" && (
                <>
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI 正在分析...</span>
                    </div>
                  ) : aiResult ? (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                      {aiResult}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      点击工具栏 AI 助手选择分析方式
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ====== 右侧：画板面板 ====== */}
      {canvasOpen && (
        <>
          <div
            onMouseDown={handleCanvasDragStart}
            className="flex w-2 flex-none cursor-col-resize items-center justify-center transition-colors hover:bg-primary/20 active:bg-primary/30"
          >
            <div className="h-8 w-0.5 rounded-full bg-border" />
          </div>

          <div
            className="flex flex-none flex-col overflow-hidden rounded-xl border bg-card"
            style={{ width: canvasWidth }}
          >
            <div className="flex h-10 flex-none items-center justify-between border-b px-3">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <PenTool className="h-3.5 w-3.5" />
                画板
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCanvasOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1">
              <ExcalidrawCanvas
                theme={appTheme === "dark" ? "dark" : "light"}
                onAPI={() => {}}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}