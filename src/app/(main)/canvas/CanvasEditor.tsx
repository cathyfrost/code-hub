"use client";

import { useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";

export default function CanvasEditor() {
  const { resolvedTheme } = useTheme();
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-0">
      <div className="flex-1 min-h-0 rounded-xl border bg-card overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => {
            excalidrawAPIRef.current = api;
          }}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          langCode="zh-CN"
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
            },
          }}
        />
      </div>
    </div>
  );
}