"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="size-4" />
      <span>返回</span>
    </button>
  );
}