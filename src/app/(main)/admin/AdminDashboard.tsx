"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  Sector,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  FileText,
  MessageCircle,
  Trophy,
  TrendingUp,
  Zap,
  Brain,
  Eye,
  Heart,
  Bookmark,
  Bot,
  NotebookPen,
  Code2,
  Swords,
  Shield,
  UserX,
  UserPlus,
  Activity,
  Target,
  BarChart3,
  CalendarDays,
  Hash,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  Sparkles,
  Star,
  CircleHelp,
} from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";

/* ------------------------------------------------------------------ */
/* 类型定义                                                          */
/* ------------------------------------------------------------------ */

interface AdminAnalyticsData {
  overview: {
    userCount: number;
    todayUserCount: number;
    yesterdayUserCount: number;
    bannedUserCount: number;
    postCount: number;
    todayPostCount: number;
    yesterdayPostCount: number;
    questionCount: number;
    commentCount: number;
    todayCommentCount: number;
    contestCount: number;
    quizCount: number;
    notebookCount: number;
    aiConversationCount: number;
    totalLikes: number;
    totalBookmarks: number;
    totalFollows: number;
    totalViews: number;
    weeklyActiveUsers: number;
    totalSubmissions: number;
    passedSubmissions: number;
    quizPassRate: number;
    contestRegistrations: number;
    contestSubmissions: number;
    totalChallenges: number;
    finishedChallenges: number;
  };
  trends: {
    dailyTrend: {
      date: string;
      label: string;
      posts: number;
      comments: number;
      users: number;
    }[];
    userGrowth: { date: string; label: string; count: number }[];
  };
  distributions: {
    skillDistribution: { name: string; value: number; level: number }[];
    postTypeDistribution: { name: string; value: number }[];
    quizDifficultyDistribution: { name: string; value: number; key: string }[];
    languageDistribution: { name: string; value: number }[];
    contestStatusDistribution: { name: string; value: number; key: string }[];
    tagDistribution: { name: string; value: number }[];
  };
  rankings: {
    topUsers: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      points: number;
      totalActivity: number;
      _count: { posts: number; comments: number; followers: number };
    }[];
    topPosts: {
      id: string;
      content: string;
      viewCount: number;
      createAt: Date;
      totalInteraction: number;
      user: { username: string; displayName: string };
      _count: { likes: number; comments: number; bookmarks: number };
    }[];
  };
  heatmap: { date: string; count: number }[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                              */
/* ------------------------------------------------------------------ */

const ACCENT = "#10b981";
const SUBTLE_BORDER = "border-border/60";

const PIE_PALETTE = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#64748b", "#84cc16", "#f97316",
];

const DIFFICULTY_COLORS: Record<string, string> = {
  简单: "#10b981",
  中等: "#f59e0b",
  困难: "#ef4444",
};

const CONTEST_STATUS_COLORS: Record<string, string> = {
  UPCOMING: "#3b82f6",
  RUNNING: "#10b981",
  ENDED: "#64748b",
};

const HEATMAP_SHADES = [
  "var(--heatmap-0,#ebedf0)",
  "var(--heatmap-1,#9be9a8)",
  "var(--heatmap-2,#40c463)",
  "var(--heatmap-3,#30a14e)",
  "var(--heatmap-4,#216e39)",
];

/* ------------------------------------------------------------------ */
/* 工具组件                                                          */
/* ------------------------------------------------------------------ */

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{e.name}</span>
          <span className="ml-auto font-medium tabular-nums">{e.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <span className="font-medium">{payload[0].name}</span>
      <span className="ml-2 tabular-nums text-muted-foreground">{payload[0].value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground/50">
      {text}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  accent,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  accent?: string;
  href?: string;
}) {
  const TrendIcon = trend && trend > 0 ? ArrowUpRight : trend && trend < 0 ? ArrowDownRight : Minus;
  const inner = (
    <div className={`rounded-xl border ${SUBTLE_BORDER} bg-card/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-sm ${href ? "cursor-pointer" : ""}`}>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="size-3.5" style={{ color: accent || "var(--muted-foreground)" }} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
        {href && <ChevronRight className="ml-auto size-3 text-muted-foreground/30" />}
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none tracking-tight">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trend > 0 ? "text-emerald-500" : "text-red-400"}`}>
            <TrendIcon className="size-3" />
            {trend > 0 ? "+" : ""}{trend}
          </span>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Card({
  title,
  icon: Icon,
  children,
  className = "",
  rightSlot,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border ${SUBTLE_BORDER} overflow-hidden bg-card ${className}`}>
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h3 className="text-[13px] font-medium">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function MiniRing({
  value,
  label,
  color,
  size = 56,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth="4" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold tabular-nums">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  const { weeks, months } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 180);
    start.setDate(start.getDate() - start.getDay());
    const dayMap: Record<string, number> = {};
    data.forEach((d) => (dayMap[d.date] = d.count));
    const weeksArr: { date: string; count: number; dow: number }[][] = [];
    const monthsArr: { label: string; wi: number }[] = [];
    let week: { date: string; count: number; dow: number }[] = [];
    let prevMonth = -1;
    const cur = new Date(start);
    while (cur <= now) {
      const key = cur.toISOString().split("T")[0];
      const dow = cur.getDay();
      const mo = cur.getMonth();
      if (dow === 0 && week.length > 0) {
        weeksArr.push(week);
        week = [];
      }
      if (mo !== prevMonth) {
        monthsArr.push({ label: `${mo + 1}月`, wi: weeksArr.length });
        prevMonth = mo;
      }
      week.push({ date: key, count: dayMap[key] || 0, dow });
      cur.setDate(cur.getDate() + 1);
    }
    if (week.length) weeksArr.push(week);
    return { weeks: weeksArr, months: monthsArr };
  }, [data]);
  const level = (c: number) => (c === 0 ? 0 : c <= 2 ? 1 : c <= 5 ? 2 : c <= 10 ? 3 : 4);
  return (
    <div className="overflow-x-auto">
      <div className="mb-1 ml-7 flex gap-0.5">
        {months.map((m, i) => (
          <span key={i} className="text-[10px] text-muted-foreground/60" style={{ marginLeft: `${Math.max(0, m.wi * 13 - (i > 0 ? months[i - 1].wi * 13 + 20 : 0))}px` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-[3px]">
        <div className="mr-1 flex flex-col gap-[3px]">
          {["", "一", "", "三", "", "五", ""].map((d, i) => (
            <div key={i} className="flex h-[11px] w-5 items-center justify-end pr-0.5 text-[9px] text-muted-foreground/50">{d}</div>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = w.find((d) => d.dow === di);
              if (!cell) return <div key={di} className="size-[11px]" />;
              return (
                <div key={di} className="group relative size-[11px] rounded-[2px]" style={{ backgroundColor: HEATMAP_SHADES[level(cell.count)] }}>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                    {cell.date} · {cell.count} 次活动
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-1">
        <span className="mr-1 text-[10px] text-muted-foreground/50">少</span>
        {HEATMAP_SHADES.map((c, i) => (
          <div key={i} className="size-[11px] rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
        <span className="ml-1 text-[10px] text-muted-foreground/50">多</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 主组件                                                            */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => kyInstance.get("/api/admin/stats").json<AdminAnalyticsData>(),
    staleTime: 60 * 1000,
  });

  const [tab, setTab] = useState<"overview" | "users" | "content" | "learning">("overview");

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <p className="text-sm text-destructive">加载失败，请稍后重试</p>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "总览" },
    { key: "users" as const, label: "用户" },
    { key: "content" as const, label: "内容" },
    { key: "learning" as const, label: "学习" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">管理后台</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">系统数据概览与分析</p>
      </div>

      {/* Tabs */}
      <div className={`inline-flex items-center gap-0.5 rounded-lg border ${SUBTLE_BORDER} bg-card p-1`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${tab === t.key ? "bg-muted/70 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel data={data} />}
      {tab === "users" && <UsersPanel data={data} />}
      {tab === "content" && <ContentPanel data={data} />}
      {tab === "learning" && <LearningPanel data={data} />}
    </div>
  );
}

/* ================================================================== */
/*  总览面板                                                          */
/* ================================================================== */

function OverviewPanel({ data }: { data: AdminAnalyticsData }) {
  const o = data.overview;
  const userTrend = o.todayUserCount - o.yesterdayUserCount;
  const postTrend = o.todayPostCount - o.yesterdayPostCount;

  return (
    <div className="space-y-4">
      {/* Hero Stats */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.04] via-card to-card">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle,currentColor 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative px-6 py-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">平台数据总览</span>
            <span className="ml-auto text-[10px] text-muted-foreground">本周活跃用户 {o.weeklyActiveUsers} 人</span>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="用户总数" value={o.userCount} sub={`今日 +${o.todayUserCount}`} trend={userTrend} accent="#8b5cf6" href="/admin/users" />
            <StatCard icon={FileText} label="帖子总数" value={o.postCount} sub={`今日 +${o.todayPostCount}`} trend={postTrend} accent="#3b82f6" href="/admin/posts" />
            <StatCard icon={MessageCircle} label="评论总数" value={o.commentCount} sub={`今日 +${o.todayCommentCount}`} accent="#6366f1" href="/admin/comments" />
            <StatCard icon={Eye} label="总浏览量" value={o.totalViews.toLocaleString()} accent={ACCENT} />
          </div>
        </div>
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Heart} label="总点赞" value={o.totalLikes} accent="#ef4444" />
        <StatCard icon={Bookmark} label="总收藏" value={o.totalBookmarks} accent="#f59e0b" />
        <StatCard icon={Users} label="总关注" value={o.totalFollows} accent="#8b5cf6" />
        <StatCard icon={UserX} label="封禁用户" value={o.bannedUserCount} accent="#ef4444" />
        <StatCard icon={CircleHelp} label="问答帖" value={o.questionCount} accent="#06b6d4" />
      </div>

      {/* Charts: Left 2/3 + Right 1/3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Daily trend */}
          <Card title="近 30 天趋势" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trends.dailyTrend}>
                <defs>
                  <linearGradient id="gAdmPost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAdmComment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAdmUser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={5} className="text-muted-foreground/60" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} className="text-muted-foreground/60" />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} iconType="circle" iconSize={6} />
                <Area type="monotone" dataKey="posts" name="发帖" stroke="#3b82f6" fill="url(#gAdmPost)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} />
                <Area type="monotone" dataKey="comments" name="评论" stroke="#6366f1" fill="url(#gAdmComment)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
                <Area type="monotone" dataKey="users" name="新用户" stroke={ACCENT} fill="url(#gAdmUser)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Heatmap */}
          <div className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <h3 className="text-[13px] font-medium">全站活跃度 · 近 180 天</h3>
              </div>
              <span className="text-[10px] text-muted-foreground/50">
                {data.heatmap.reduce((s, d) => s + d.count, 0)} 次活动
              </span>
            </div>
            <Heatmap data={data.heatmap} />
          </div>

          {/* Top posts */}
          <Card title="热门帖子 Top 10" icon={Star}>
            {data.rankings.topPosts.length > 0 ? (
              <div className="divide-y divide-border/40">
                {data.rankings.topPosts.map((p, i) => (
                  <div key={p.id} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/20">
                    <span className="mt-0.5 w-4 shrink-0 text-center text-[11px] font-medium tabular-nums text-muted-foreground/40">{i + 1}</span>
                    <Link href={`/posts/${p.id}`} className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm leading-relaxed">{p.content}</p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                        <span>{p.user.displayName}</span>
                        <span className="flex items-center gap-0.5"><Heart className="size-3" />{p._count.likes}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="size-3" />{p._count.comments}</span>
                        <span className="flex items-center gap-0.5"><Eye className="size-3" />{p.viewCount}</span>
                      </div>
                    </Link>
                    <div className="shrink-0 text-right">
                      <span className="text-base font-semibold tabular-nums">{p.totalInteraction}</span>
                      <p className="text-[10px] text-muted-foreground/40">互动</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="暂无帖子" />
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Platform health */}
          <div className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <h3 className="text-[13px] font-medium">平台健康度</h3>
            </div>
            <div className="flex items-center justify-center gap-6">
              <MiniRing value={o.quizPassRate} label="题目通过率" color={ACCENT} />
              <MiniRing value={o.postCount > 0 ? Math.round((o.questionCount / o.postCount) * 100) : 0} label="问答占比" color="#6366f1" />
              <MiniRing value={o.totalChallenges > 0 ? Math.round((o.finishedChallenges / o.totalChallenges) * 100) : 0} label="对战完成率" color="#f59e0b" />
            </div>
          </div>

          {/* Quick stats */}
          <div className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h3 className="text-[13px] font-medium">功能数据</h3>
            </div>
            <div className="space-y-0">
              {[
                { icon: Trophy, label: "竞赛", value: o.contestCount, sub: `${o.contestRegistrations} 人报名`, href: "/admin/contests" },
                { icon: Swords, label: "1v1 对战", value: o.totalChallenges, sub: `${o.finishedChallenges} 已完成` },
                { icon: Brain, label: "题库", value: o.quizCount, sub: `${o.totalSubmissions} 次提交` },
                { icon: NotebookPen, label: "笔记", value: o.notebookCount },
                { icon: Bot, label: "AI 对话", value: o.aiConversationCount },
              ].map((item) => {
                const row = (
                  <div key={item.label} className={`flex items-center gap-2.5 ${item.href ? "-mx-1 cursor-pointer rounded-md px-1 hover:bg-muted/30" : ""} h-10 transition-colors`}>
                    <item.icon className="size-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="flex-1 text-[12px] text-muted-foreground">{item.label}</span>
                    <span className="text-[13px] font-semibold tabular-nums">{item.value}</span>
                    {item.sub && <span className="ml-0.5 text-[10px] text-muted-foreground/40">{item.sub}</span>}
                    {item.href && <ChevronRight className="size-3 text-muted-foreground/30" />}
                  </div>
                );
                return item.href ? <Link key={item.label} href={item.href}>{row}</Link> : row;
              })}
            </div>
          </div>

          {/* Post type pie */}
          <Card title="帖子类型分布" icon={FileText}>
            {data.distributions.postTypeDistribution.some((d) => d.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.distributions.postTypeDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value" nameKey="name" stroke="none" animationDuration={800} activeShape={<Sector outerRadius={69} />}>
                      {data.distributions.postTypeDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {data.distributions.postTypeDistribution.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2 text-[11px]">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                      <span className="truncate text-muted-foreground">{t.name}</span>
                      <span className="ml-auto font-medium tabular-nums">{t.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Empty text="暂无数据" />
            )}
          </Card>

          {/* Tags */}
          {data.distributions.tagDistribution.length > 0 && (
            <Card title="热门标签" icon={Hash}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.distributions.tagDistribution.slice(0, 8)} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value" nameKey="name" stroke="none" animationDuration={800}>
                    {data.distributions.tagDistribution.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.distributions.tagDistribution.slice(0, 6).map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2 text-[11px]">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className="truncate text-muted-foreground">#{t.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{t.value} 篇</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  用户面板                                                          */
/* ================================================================== */

function UsersPanel({ data }: { data: AdminAnalyticsData }) {
  const o = data.overview;
  const cumulativeGrowth = useMemo(() => {
    let total = o.userCount;
    const reversed = [...data.trends.userGrowth].reverse();
    reversed.forEach((d) => (total -= d.count));
    return data.trends.userGrowth.map((d) => {
      total += d.count;
      return { ...d, cumulative: total };
    });
  }, [data.trends.userGrowth, o.userCount]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="用户总数" value={o.userCount} accent="#8b5cf6" />
        <StatCard icon={UserPlus} label="今日注册" value={o.todayUserCount} trend={o.todayUserCount - o.yesterdayUserCount} accent={ACCENT} />
        <StatCard icon={UserX} label="封禁用户" value={o.bannedUserCount} accent="#ef4444" />
        <StatCard icon={Activity} label="周活跃用户" value={o.weeklyActiveUsers} accent="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* User growth trend */}
        <Card title="用户增长趋势 · 近 30 天" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cumulativeGrowth}>
              <defs>
                <linearGradient id="gUserGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={5} className="text-muted-foreground/60" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} className="text-muted-foreground/60" />
              <Tooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="cumulative" name="累计用户" stroke="#8b5cf6" fill="url(#gUserGrowth)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Daily registration bar */}
        <Card title="每日新增注册" icon={UserPlus}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.trends.userGrowth} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={5} className="text-muted-foreground/60" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} className="text-muted-foreground/60" />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="新增用户" fill={ACCENT} radius={[3, 3, 0, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Skill distribution */}
        <Card title="用户技能等级分布" icon={Brain}>
          {data.distributions.skillDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.distributions.skillDistribution} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" name="人数" radius={[4, 4, 0, 0]} animationDuration={700}>
                  {data.distributions.skillDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="暂无数据" />
          )}
        </Card>

        {/* Top active users */}
        <Card title="活跃用户 Top 10" icon={Star}>
          {data.rankings.topUsers.length > 0 ? (
            <div className="divide-y divide-border/40">
              {data.rankings.topUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-4 text-center text-[11px] font-medium tabular-nums text-muted-foreground/40">{i + 1}</span>
                  <UserAvatar avatarUrl={u.avatarUrl} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">@{u.username} · {u._count.posts} 帖 · {u._count.followers} 粉丝</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums">{u.points}</span>
                    <p className="text-[10px] text-muted-foreground/40">积分</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="暂无数据" />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  内容面板                                                          */
/* ================================================================== */

function ContentPanel({ data }: { data: AdminAnalyticsData }) {
  const o = data.overview;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={FileText} label="帖子总数" value={o.postCount} accent="#3b82f6" />
        <StatCard icon={CircleHelp} label="问答帖" value={o.questionCount} accent="#06b6d4" />
        <StatCard icon={MessageCircle} label="评论总数" value={o.commentCount} accent="#6366f1" />
        <StatCard icon={Heart} label="点赞总数" value={o.totalLikes} accent="#ef4444" />
        <StatCard icon={Bookmark} label="收藏总数" value={o.totalBookmarks} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Daily content trend */}
        <Card title="每日发帖与评论" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trends.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={5} className="text-muted-foreground/60" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} className="text-muted-foreground/60" />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} iconType="circle" iconSize={6} />
              <Line type="monotone" dataKey="posts" name="发帖" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              <Line type="monotone" dataKey="comments" name="评论" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Post type pie */}
        <Card title="帖子类型分布" icon={Target}>
          {data.distributions.postTypeDistribution.some((d) => d.value > 0) ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={260}>
                <PieChart>
                  <Pie data={data.distributions.postTypeDistribution} cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2} dataKey="value" nameKey="name" stroke="none" animationDuration={800} activeShape={<Sector outerRadius={88} />}>
                    {data.distributions.postTypeDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.distributions.postTypeDistribution.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2 text-[11px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="暂无数据" />
          )}
        </Card>
      </div>

      {/* Tags bar chart */}
      {data.distributions.tagDistribution.length > 0 && (
        <Card title="热门标签 Top 10" icon={Hash}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.distributions.tagDistribution.slice(0, 10)} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" name="使用次数" fill={ACCENT} radius={[0, 4, 4, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/*  学习面板                                                          */
/* ================================================================== */

function LearningPanel({ data }: { data: AdminAnalyticsData }) {
  const o = data.overview;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Brain} label="题库总数" value={o.quizCount} accent={ACCENT} />
        <StatCard icon={Target} label="总提交" value={o.totalSubmissions} accent="#3b82f6" />
        <StatCard icon={Zap} label="通过率" value={`${o.quizPassRate}%`} accent="#6366f1" />
        <StatCard icon={Trophy} label="竞赛数" value={o.contestCount} accent="#f59e0b" href="/admin/contests" />
        <StatCard icon={Swords} label="1v1 对战" value={o.totalChallenges} accent="#ef4444" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Quiz difficulty */}
        <Card title="题目难度分布" icon={Activity}>
          {data.distributions.quizDifficultyDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.distributions.quizDifficultyDistribution} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" name="题目数" radius={[4, 4, 0, 0]} animationDuration={700}>
                  {data.distributions.quizDifficultyDistribution.map((e) => (
                    <Cell key={e.name} fill={DIFFICULTY_COLORS[e.name] || "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="暂无数据" />
          )}
        </Card>

        {/* Language distribution */}
        <Card title="编程语言分布" icon={Code2}>
          {data.distributions.languageDistribution.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={260}>
                <PieChart>
                  <Pie data={data.distributions.languageDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name" stroke="none" animationDuration={800} activeShape={<Sector outerRadius={84} />}>
                    {data.distributions.languageDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.distributions.languageDistribution.map((l, i) => (
                  <div key={l.name} className="flex items-center gap-2 text-[11px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className="text-muted-foreground">{l.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{l.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="暂无数据" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Contest status */}
        <Card title="竞赛状态" icon={Trophy}>
          <div className="flex items-center gap-6">
            <div className="flex flex-1 items-center justify-center gap-6 py-4">
              {data.distributions.contestStatusDistribution.map((s) => (
                <div key={s.name} className="text-center">
                  <p className="text-3xl font-bold tabular-nums" style={{ color: CONTEST_STATUS_COLORS[s.key] || "#64748b" }}>
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.name}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-l border-border/40 pl-6">
              <div>
                <p className="text-lg font-semibold tabular-nums">{o.contestRegistrations}</p>
                <p className="text-[10px] text-muted-foreground">总报名人次</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums">{o.contestSubmissions}</p>
                <p className="text-[10px] text-muted-foreground">总提交次数</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Challenge stats */}
        <Card title="1v1 对战统计" icon={Swords}>
          <div className="flex items-center justify-center gap-12 py-6">
            <div className="text-center">
              <p className="text-4xl font-bold tabular-nums text-primary">{o.totalChallenges}</p>
              <p className="mt-1 text-xs text-muted-foreground">总对战数</p>
            </div>
            <div className="h-16 w-px bg-border/40" />
            <div className="text-center">
              <p className="text-4xl font-bold tabular-nums text-emerald-500">{o.finishedChallenges}</p>
              <p className="mt-1 text-xs text-muted-foreground">已完成</p>
            </div>
            <div className="h-16 w-px bg-border/40" />
            <div className="text-center">
              <p className="text-4xl font-bold tabular-nums text-muted-foreground">{o.totalChallenges - o.finishedChallenges}</p>
              <p className="mt-1 text-xs text-muted-foreground">进行中/取消</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}