"use client";

import { Coins, Sparkles, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface MyPointsCardClientProps {
  points: number;
}

export default function MyPointsCardClient({ points }: MyPointsCardClientProps) {
  const { toast } = useToast();
  const [currentPoints, setCurrentPoints] = useState(points);
  const [signedToday, setSignedToday] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignin() {
    if (signedToday || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/points/signin", { method: "POST" });
      const data = await res.json();

      if (data.awarded > 0) {
        setCurrentPoints((p) => p + data.awarded);
        setSignedToday(true);
        toast({ description: `签到成功！获得 ${data.awarded} 积分 🎉` });
      } else {
        setSignedToday(true);
        toast({ description: "今天已经签到过了" });
      }
    } catch {
      toast({ variant: "destructive", description: "签到失败，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Coins className="size-4 text-orange-500" />
          我的积分
        </div>
        <button
          onClick={handleSignin}
          disabled={signedToday || loading}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition-all",
            signedToday
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-primary/10 text-primary hover:bg-primary/20 active:scale-95",
            loading && "opacity-60",
          )}
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : signedToday ? (
            <Check className="size-3" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {loading ? "签到中" : signedToday ? "已签到" : "每日签到"}
        </button>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">
          {currentPoints}
        </span>
        <span className="text-sm text-muted-foreground">积分</span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground/60">
        每日签到 +2 · 回答被采纳可获得悬赏积分
      </p>
    </div>
  );
}