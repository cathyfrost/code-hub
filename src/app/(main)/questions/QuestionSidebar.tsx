import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Suspense } from "react";
import { Flame, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import MyPointsCardClient from "./MyPointsCardClient";

export default function QuestionSidebar() {
  return (
    <div className="sticky top-[5.25rem] hidden h-fit w-72 flex-none space-y-3 md:block lg:w-80">
      <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
        <MyPointsCard />
        <CommunityActivity />
        <PopularTags />
        <BountyLeaderboard />
        <RecentQuestions />
      </Suspense>
    </div>
  );
}

/* ── 我的积分 ── */
async function MyPointsCard() {
  const { user } = await validateRequest();
  if (!user) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true },
  });

  return <MyPointsCardClient points={currentUser?.points ?? 0} />;
}

/* ── 社区活跃度（参考 SO 的 Community activity） ── */
async function CommunityActivity() {
  const [totalQuestions, resolvedQuestions, totalComments, totalLikes] =
    await Promise.all([
      prisma.post.count({ where: { isQuestion: true } }),
      prisma.post.count({ where: { isQuestion: true, isResolved: true } }),
      prisma.comment.count({ where: { isAnswer: true } }),
      prisma.like.count({ where: { post: { isQuestion: true } } }),
    ]);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-sm font-semibold text-muted-foreground">
          <TrendingUp className="mr-1.5 inline size-4 align-[-3px]" />
          社区统计
        </span>
      </div>
      <div className="space-y-2.5 px-4 pb-4 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">总问题数</span>
          <span className="font-semibold text-foreground">
            {totalQuestions}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">已解决</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {resolvedQuestions}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">解决率</span>
          <span className="font-semibold text-foreground">
            {totalQuestions > 0
              ? Math.round((resolvedQuestions / totalQuestions) * 100)
              : 0}
            %
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">总回答数</span>
          <span className="font-semibold text-foreground">{totalComments}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">总点赞数</span>
          <span className="font-semibold text-foreground">{totalLikes}</span>
        </div>
      </div>
    </div>
  );
}

/* ── 热门标签（参考 SO 的 Popular tags） ── */
async function PopularTags() {
  const posts = await prisma.post.findMany({
    where: { isQuestion: true },
    select: { content: true },
    take: 200,
    orderBy: { createAt: "desc" },
  });

  const tagCount: Record<string, number> = {};
  for (const p of posts) {
    const matched = p.content
      .replace(/```[\s\S]*?```/g, "")
      .match(/#[^\s#<>{};()]+/g);
    if (matched) {
      for (const raw of matched) {
        const t = raw.replace(/^#/, "");
        tagCount[t] = (tagCount[t] || 0) + 1;
      }
    }
  }

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (topTags.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4 text-sm font-semibold text-muted-foreground">
        🔥 热门标签
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-4">
        {topTags.map(([tag]) => (
          <span
            key={tag}
            className="rounded bg-sky-500/8 px-1.5 py-0.5 text-[12px] text-sky-700 transition-colors hover:bg-sky-500/15 dark:bg-sky-400/10 dark:text-sky-400 dark:hover:bg-sky-400/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 高额悬赏 ── */
async function BountyLeaderboard() {
  const topBounties = await prisma.post.findMany({
    where: {
      isQuestion: true,
      isResolved: false,
      bounty: { gt: 0 },
    },
    select: {
      id: true,
      content: true,
      bounty: true,
    },
    orderBy: { bounty: "desc" },
    take: 5,
  });

  if (topBounties.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4 text-sm font-semibold text-muted-foreground">
        <Flame className="size-4 text-orange-500" />
        高额悬赏
      </div>
      <div className="px-2 pb-3">
        {topBounties.map((q) => {
          const title =
            q.content
              .replace(/```[\s\S]*?```/g, "")
              .replace(/#[^\s#]+/g, "")
              .split("\n")
              .find((l) => l.trim())
              ?.trim()
              .slice(0, 40) || "无标题";

          return (
            <Link
              key={q.id}
              href={`/questions/${q.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted"
            >
              <span className="min-w-0 truncate text-[13px] text-foreground/80">
                {title}
              </span>
              <span className="ml-2 shrink-0 rounded bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                +{q.bounty}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── 最新问题（参考 SO 的 Recently viewed posts） ── */
async function RecentQuestions() {
  const recent = await prisma.post.findMany({
    where: { isQuestion: true },
    select: {
      id: true,
      content: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createAt: "desc" },
    take: 5,
  });

  if (recent.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="px-4 pb-2 pt-4 text-sm font-semibold text-muted-foreground">
        最新问题
      </div>
      <div className="px-2 pb-3">
        {recent.map((q) => {
          const title =
            q.content
              .replace(/```[\s\S]*?```/g, "")
              .replace(/#[^\s#]+/g, "")
              .split("\n")
              .find((l) => l.trim())
              ?.trim()
              .slice(0, 50) || "无标题";

          return (
            <div
              key={q.id}
              className="rounded-lg px-2 py-2 transition-colors hover:bg-muted"
            >
              <Link
                href={`/questions/${q.id}`}
                className="text-[13px] leading-snug text-primary hover:text-primary/80"
              >
                {title}
              </Link>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{q._count.likes} 票</span>
                <span>•</span>
                <span>{q._count.comments} 回答</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
