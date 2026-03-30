"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import ContestList from "./ContestList";
import ChallengePanel from "./ChallengePanel";

type Tab = "contest" | "challenge";

export default function ContestPage() {
  const [activeTab, setActiveTab] = useState<Tab>("contest");

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-5">
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <h1 className="text-center text-2xl font-bold">算法竞赛</h1>

          {/* Tab 切换 */}
          <div className="mt-4 flex justify-center">
            <div className="inline-flex rounded-lg border bg-background p-1">
              <button
                onClick={() => setActiveTab("contest")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "contest"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                周赛
              </button>
              <button
                onClick={() => setActiveTab("challenge")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "challenge"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
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
