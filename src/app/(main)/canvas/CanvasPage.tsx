"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const CanvasEditor = dynamic(() => import("./CanvasEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  ),
});

export default function CanvasPage() {
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <CanvasEditor />
      </div>
    </main>
  );
}