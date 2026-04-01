"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Swords } from "lucide-react";
import ContestList from "./ContestList";
import ChallengePanel from "./ChallengePanel";

type Tab = "contest" | "challenge";

export default function ContestPage() {
  const [activeTab, setActiveTab] = useState<Tab>("contest");

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-5">
        {/* 顶部标题 + Tab */}
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <h1 className="text-center text-2xl font-bold">算法竞赛</h1>

          <div className="mt-4 flex justify-center">
            <div className="inline-flex gap-1 rounded-full border bg-muted/40 p-1">
              <button
                onClick={() => setActiveTab("contest")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
                  activeTab === "contest"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Trophy className="size-3.5" />
                周赛
              </button>
              <button
                onClick={() => setActiveTab("challenge")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
                  activeTab === "challenge"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Swords className="size-3.5" />
                1v1 对战
              </button>
            </div>
          </div>
        </div>

        {activeTab === "contest" ? <ContestList /> : <ChallengePanel />}
      </div>
    </main>
  );
}