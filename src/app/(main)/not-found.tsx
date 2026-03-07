"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function Star({ delay, size, x, y }: { delay: number; size: number; x: number; y: number }) {
  return (
    <div
      className="absolute rounded-full bg-foreground/20"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}%`,
        top: `${y}%`,
        animation: `twinkle ${2 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

const stars = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  delay: Math.random() * 3,
  size: Math.random() * 3 + 1,
  x: Math.random() * 100,
  y: Math.random() * 100,
}));

const codeLines = [
  "$ find /universe -name 'page'",
  "searching...",
  "Error 404: page not found",
  "$ echo '也许它去宇宙旅行了 🚀'",
];

export default function NotFound() {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (currentLine >= codeLines.length) {
      setTimeout(() => setShowContent(true), 400);
      return;
    }

    const line = codeLines[currentLine];
    if (currentChar < line.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[currentLine] = line.slice(0, currentChar + 1);
          return updated;
        });
        setCurrentChar((c) => c + 1);
      }, 30 + Math.random() * 40);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentLine, currentChar]);

  return (
    <main className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-card">
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes drift {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(10px) translateY(-15px); }
          50% { transform: translateX(-5px) translateY(-25px); }
          75% { transform: translateX(-15px) translateY(-10px); }
          100% { transform: translateX(0) translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* 星空背景 */}
      {stars.map((star) => (
        <Star key={star.id} {...star} />
      ))}

      {/* 漂浮的宇航员 */}
      <div
        className="mb-8 select-none text-8xl"
        style={{ animation: "drift 8s ease-in-out infinite" }}
      >
        👨‍🚀
      </div>

      {/* 终端窗口 */}
      <div className="relative z-10 mx-4 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background/80 shadow-2xl backdrop-blur-sm">
        {/* 终端标题栏 */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="size-3 rounded-full bg-red-400/80" />
          <div className="size-3 rounded-full bg-yellow-400/80" />
          <div className="size-3 rounded-full bg-green-400/80" />
          <span className="ml-2 text-xs text-muted-foreground font-mono">
            codehub@universe:~
          </span>
        </div>

        {/* 终端内容 */}
        <div className="p-5 font-mono text-sm leading-7">
          {displayedLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                i === 2 && "text-destructive font-semibold",
                i === 3 && "text-primary",
              )}
            >
              {line}
              {i === currentLine && currentLine < codeLines.length && (
                <span
                  className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-primary"
                  style={{ animation: "blink 0.8s step-end infinite" }}
                />
              )}
            </div>
          ))}
          {currentLine >= codeLines.length && (
            <span
              className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-primary"
              style={{ animation: "blink 0.8s step-end infinite" }}
            />
          )}
        </div>
      </div>

      {/* 404 和返回按钮 */}
      <div
        className={cn(
          "mt-10 flex flex-col items-center gap-4 transition-all duration-700",
          showContent
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0",
        )}
      >
        <h1 className="text-7xl font-black tracking-tighter text-foreground/10">
          404
        </h1>
        <p className="text-muted-foreground">
          这个页面不存在，也许它去探索银河系了
        </p>
        <Link
          href="/"
          className="group mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.96]"
        >
          <span
            className="inline-block transition-transform duration-300 group-hover:-translate-x-1"
          >
            ←
          </span>
          返回首页
        </Link>
      </div>
    </main>
  );
}