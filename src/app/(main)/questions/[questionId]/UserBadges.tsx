"use client";

import { cn } from "@/lib/utils";

const LEVEL_CONFIG: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  1: {
    label: "Lv1",
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
  },
  2: {
    label: "Lv2",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950",
  },
  3: {
    label: "Lv3",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
  4: {
    label: "Lv4",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950",
  },
  5: {
    label: "Lv5",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
  },
};

export function LevelBadge({ level }: { level: number }) {
  const info = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
  return (
    <span
      className={cn(
        "rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        info.color,
        info.bg,
      )}
    >
      {info.label}
    </span>
  );
}

export function OPBadge() {
  return (
    <span className="rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
      题主
    </span>
  );
}