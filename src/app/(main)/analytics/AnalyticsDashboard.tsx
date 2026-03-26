"use client";

import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { motion, AnimatePresence } from "framer-motion";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Users,
  FileText,
  Code2,
  Trophy,
  Flame,
  TrendingUp,
  Zap,
  Brain,
  NotebookPen,
  Bot,
  Star,
  Target,
  Activity,
  Loader2,
  BarChart3,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Award,
  Sparkles,
  CalendarDays,
  Hash,
} from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

interface AnalyticsData {
  overview: {
    totalPosts: number;
    totalLikesReceived: number;
    totalCommentsReceived: number;
    totalBookmarksReceived: number;
    totalFollowers: number;
    totalFollowing: number;
    totalLikesGiven: number;
    totalCommentsGiven: number;
    totalBookmarksGiven: number;
    totalNotebooks: number;
    totalNotebookFolders: number;
    totalAiConversations: number;
    totalAiMessages: number;
    totalNotifications: number;
    unreadNotifications: number;
    avgLikesPerPost: string;
    avgCommentsPerPost: string;
    avgBookmarksPerPost: string;
    last7DaysActive: number;
    codePostRatio: number;
  };
  quiz: {
    totalSubmissions: number;
    passedSubmissions: number;
    uniquePassed: number;
    passRate: number;
    difficultyDistribution: { difficulty: string; total: number; passed: number; rate: number }[];
    languageDistribution: { name: string; value: number }[];
    recentSubmissions: { id: string; quizTitle: string; difficulty: string; language: string; passed: boolean; createAt: string }[];
  };
  trends: {
    dailyTrend: { date: string; label: string; posts: number; comments: number; likes: number }[];
  };
  distributions: {
    tagDistribution: { name: string; value: number }[];
    skillRadar: { skill: string; value: number }[];
  };
  heatmap: { date: string; count: number }[];
  topPosts: { id: string; content: string; likes: number; comments: number; bookmarks: number; total: number; createAt: string }[];
  recentFollowers: { username: string; displayName: string; avatarUrl: string | null }[];
  followerGrowth: { date: string; label: string; count: number; cumulative: number }[];
}

const ACCENT = "#10b981";
const SUBTLE_BORDER = "border-border/60";
const PIE_PALETTE = ["#10b981","#6366f1","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#64748b","#84cc16","#f97316","#14b8a6","#e11d48"];
const HEATMAP_SHADES = ["var(--heatmap-0,rgba(16,185,129,0.06))","var(--heatmap-1,rgba(16,185,129,0.2))","var(--heatmap-2,rgba(16,185,129,0.4))","var(--heatmap-3,rgba(16,185,129,0.65))","var(--heatmap-4,rgba(16,185,129,0.9))"];
const DIFFICULTY_COLORS: Record<string,string> = { "简单":"#10b981","中等":"#f59e0b","困难":"#ef4444" };

const stagger = { hidden:{opacity:0}, visible:{opacity:1,transition:{staggerChildren:0.04,delayChildren:0.05}} };
const fadeUp = { hidden:{opacity:0,y:16}, visible:{opacity:1,y:0,transition:{type:"spring" as const,stiffness:120,damping:18}} };

function Metric({icon:Icon,label,value,sub}:{icon:React.ElementType;label:string;value:string|number;sub?:string}) {
  return (
    <motion.div variants={fadeUp} whileHover={{y:-2,transition:{duration:0.2}}}
      className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4 transition-shadow hover:shadow-sm`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <Icon className="size-[14px] shrink-0" /><span className="text-xs tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function Card({title,icon:Icon,children,className="",rightSlot}:{title:string;icon:React.ElementType;children:React.ReactNode;className?:string;rightSlot?:React.ReactNode}) {
  return (
    <motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" /><h3 className="text-[13px] font-medium">{title}</h3></div>
        {rightSlot}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </motion.div>
  );
}

function ChartTooltipContent({active,payload,label}:any) {
  if(!active||!payload?.length) return null;
  return (<div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
    <p className="text-muted-foreground mb-1">{label}</p>
    {payload.map((e:any,i:number)=>(<div key={i} className="flex items-center gap-2"><span className="size-1.5 rounded-full" style={{backgroundColor:e.color}}/><span className="text-muted-foreground">{e.name}</span><span className="ml-auto font-medium tabular-nums">{e.value}</span></div>))}
  </div>);
}

function PieTooltipContent({active,payload}:any) {
  if(!active||!payload?.length) return null;
  return (<div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs"><span className="font-medium">{payload[0].name}</span><span className="ml-2 text-muted-foreground tabular-nums">{payload[0].value}</span></div>);
}

function Empty({text}:{text:string}) { return <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground/50">{text}</div>; }

function Heatmap({data}:{data:{date:string;count:number}[]}) {
  const {weeks,months} = useMemo(()=>{
    const now=new Date();const start=new Date(now);start.setDate(start.getDate()-180);start.setDate(start.getDate()-start.getDay());
    const dayMap:Record<string,number>={};data.forEach(d=>(dayMap[d.date]=d.count));
    const weeksArr:{date:string;count:number;dow:number}[][]=[];const monthsArr:{label:string;wi:number}[]=[];
    let week:{date:string;count:number;dow:number}[]=[];let prevMonth=-1;const cur=new Date(start);
    while(cur<=now){const key=cur.toISOString().split("T")[0];const dow=cur.getDay();const mo=cur.getMonth();
      if(dow===0&&week.length>0){weeksArr.push(week);week=[];}
      if(mo!==prevMonth){monthsArr.push({label:`${mo+1}月`,wi:weeksArr.length});prevMonth=mo;}
      week.push({date:key,count:dayMap[key]||0,dow});cur.setDate(cur.getDate()+1);}
    if(week.length)weeksArr.push(week);return{weeks:weeksArr,months:monthsArr};
  },[data]);
  const level=(c:number)=>c===0?0:c<=2?1:c<=4?2:c<=6?3:4;
  return (<div className="overflow-x-auto">
    <div className="flex mb-1 ml-7 gap-0.5">{months.map((m,i)=>(<span key={i} className="text-[10px] text-muted-foreground/60" style={{marginLeft:`${Math.max(0,m.wi*13-(i>0?months[i-1].wi*13+20:0))}px`}}>{m.label}</span>))}</div>
    <div className="flex gap-[3px]">
      <div className="flex flex-col gap-[3px] mr-1">{["","一","","三","","五",""].map((d,i)=>(<div key={i} className="h-[11px] text-[9px] text-muted-foreground/50 flex items-center justify-end pr-0.5 w-5">{d}</div>))}</div>
      {weeks.map((w,wi)=>(<div key={wi} className="flex flex-col gap-[3px]">{Array.from({length:7}).map((_,di)=>{const cell=w.find(d=>d.dow===di);if(!cell)return <div key={di} className="size-[11px]"/>;return(<motion.div key={di} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:wi*0.008}} className="size-[11px] rounded-[2px] group relative" style={{backgroundColor:HEATMAP_SHADES[level(cell.count)]}}><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-popover border text-[10px] rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">{cell.date} · {cell.count} 次活动</div></motion.div>);})}</div>))}
    </div>
    <div className="flex items-center gap-1 mt-2.5 justify-end"><span className="text-[10px] text-muted-foreground/50 mr-1">少</span>{HEATMAP_SHADES.map((c,i)=>(<div key={i} className="size-[11px] rounded-[2px]" style={{backgroundColor:c}}/>))}<span className="text-[10px] text-muted-foreground/50 ml-1">多</span></div>
  </div>);
}

function Ring({value,label,sub,color,size=72}:{value:number;label:string;sub?:string;color:string;size?:number}) {
  const r=(size-12)/2;const circ=2*Math.PI*r;
  return (<div className="flex flex-col items-center"><div className="relative" style={{width:size,height:size}}>
    <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth="5"/>
    <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:circ*(1-value/100)}} transition={{duration:1.2,ease:"easeOut"}}/></svg>
    <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-semibold tabular-nums">{value}%</span></div>
  </div><span className="mt-2 text-xs font-medium" style={{color}}>{label}</span>{sub&&<span className="text-[10px] text-muted-foreground">{sub}</span>}</div>);
}

function MiniRing({value,color,size=40}:{value:number;color:string;size?:number}) {
  const r=(size-8)/2;const circ=2*Math.PI*r;
  return (<div className="relative" style={{width:size,height:size}}>
    <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth="3"/>
    <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:circ*(1-value/100)}} transition={{duration:1,ease:"easeOut"}}/></svg>
    <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-semibold tabular-nums">{value}%</span></div>
  </div>);
}

export default function AnalyticsDashboard() {
  const {data,isLoading,error} = useQuery({queryKey:["analytics"],queryFn:()=>kyInstance.get("/api/analytics").json<AnalyticsData>(),staleTime:5*60*1000});
  const [tab,setTab] = useState<"overview"|"content"|"quiz"|"social">("overview");
  if(isLoading) return (<div className="flex-1 flex items-center justify-center min-h-[60vh]"><motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center gap-3"><Loader2 className="size-5 animate-spin text-muted-foreground"/><span className="text-sm text-muted-foreground">加载中...</span></motion.div></div>);
  if(error||!data) return (<div className="flex-1 flex items-center justify-center min-h-[60vh]"><p className="text-sm text-destructive">加载失败，请稍后重试</p></div>);
  const tabs=[{key:"overview" as const,label:"总览"},{key:"content" as const,label:"内容"},{key:"quiz" as const,label:"题库"},{key:"social" as const,label:"社交"}];
  return (
    <motion.main initial="hidden" animate="visible" variants={stagger} className="flex-1 space-y-6 pb-12">
      <motion.div variants={fadeUp}><h1 className="text-xl font-semibold tracking-tight">数据分析</h1><p className="text-sm text-muted-foreground mt-0.5">你在 CodeHub 上的学习与创作足迹</p></motion.div>
      <motion.div variants={fadeUp} className={`inline-flex items-center gap-0.5 rounded-lg border ${SUBTLE_BORDER} bg-card p-1`}>
        {tabs.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} className={`relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${tab===t.key?"text-foreground":"text-muted-foreground hover:text-foreground"}`}>{tab===t.key&&(<motion.div layoutId="tab-pill" className="absolute inset-0 rounded-md bg-muted/70" transition={{type:"spring" as const,stiffness:300,damping:30}}/>)}<span className="relative z-10">{t.label}</span></button>))}
      </motion.div>
      <AnimatePresence mode="wait">
        {tab==="overview"&&<OverviewPanel key="ov" data={data}/>}
        {tab==="content"&&<ContentPanel key="ct" data={data}/>}
        {tab==="quiz"&&<QuizPanel key="qz" data={data}/>}
        {tab==="social"&&<SocialPanel key="sc" data={data}/>}
      </AnimatePresence>
    </motion.main>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW — Bilibili-style hero + bento grid
   ═══════════════════════════════════════════════════════════ */

function OverviewPanel({data}:{data:AnalyticsData}) {
  const influence=calcInfluence(data);
  const totalInteraction=data.overview.totalLikesReceived+data.overview.totalCommentsReceived+data.overview.totalBookmarksReceived;
  const badges=computeBadges(data);

  return (
    <motion.div initial="hidden" animate="visible" exit={{opacity:0,y:-8}} variants={stagger} className="space-y-4">
      {/* Hero banner */}
      <motion.div variants={fadeUp} className="relative rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.04] via-card to-card overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"radial-gradient(circle,currentColor 1px,transparent 1px)",backgroundSize:"24px 24px"}}/>
        <div className="relative px-6 py-6">
          <div className="flex items-center gap-2 mb-5"><Sparkles className="size-4 text-emerald-500"/><span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">数据总览</span><span className="text-[10px] text-muted-foreground ml-auto">本周活跃 {data.overview.last7DaysActive}/7 天</span></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              {icon:Heart,label:"获赞总数",value:data.overview.totalLikesReceived,accent:"#ef4444",href:"/analytics/likes"},
              {icon:Users,label:"粉丝数",value:data.overview.totalFollowers,accent:"#8b5cf6",href:undefined},
              {icon:Zap,label:"总互动",value:totalInteraction,accent:ACCENT,href:undefined},
              {icon:FileText,label:"发帖总数",value:data.overview.totalPosts,accent:"#3b82f6",href:undefined},
            ] as const).map(m=>{
              const inner = (<motion.div key={m.label} whileHover={{y:-2,transition:{duration:0.15}}} className={`rounded-xl border ${SUBTLE_BORDER} bg-card/80 backdrop-blur-sm p-4 hover:shadow-sm transition-all ${m.href ? "cursor-pointer" : ""}`}>
                <div className="flex items-center gap-1.5 mb-2"><m.icon className="size-3.5" style={{color:m.accent}}/><span className="text-[11px] text-muted-foreground">{m.label}</span>{m.href && <ChevronRight className="size-3 text-muted-foreground/30 ml-auto"/>}</div>
                <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">{m.value}</p>
              </motion.div>);
              return m.href ? <Link key={m.label} href={m.href}>{inner}</Link> : inner;
            })}
          </div>
        </div>
      </motion.div>

      {/* Bento: left 2/3 + right 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Trend */}
          <Card title="近 30 天趋势" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.trends.dailyTrend}>
                <defs>
                  <linearGradient id="gPost" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.15}/><stop offset="100%" stopColor={ACCENT} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gLike" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gComment" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]"/>
                <XAxis dataKey="label" tick={{fontSize:10}} tickLine={false} axisLine={false} interval={5} className="text-muted-foreground/60"/>
                <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} width={24} className="text-muted-foreground/60"/>
                <Tooltip content={<ChartTooltipContent/>}/>
                <Legend wrapperStyle={{fontSize:"11px",paddingTop:"6px"}} iconType="circle" iconSize={6}/>
                <Area type="monotone" dataKey="posts" name="发帖" stroke={ACCENT} fill="url(#gPost)" strokeWidth={1.5} dot={false} activeDot={{r:3,fill:ACCENT,strokeWidth:0}}/>
                <Area type="monotone" dataKey="likes" name="获赞" stroke="#ef4444" fill="url(#gLike)" strokeWidth={1.5} dot={false} activeDot={{r:3,fill:"#ef4444",strokeWidth:0}}/>
                <Area type="monotone" dataKey="comments" name="评论" stroke="#6366f1" fill="url(#gComment)" strokeWidth={1.5} dot={false} activeDot={{r:3,fill:"#6366f1",strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Top posts */}
          <motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card overflow-hidden`}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3"><div className="flex items-center gap-2"><Star className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">热门内容</h3></div><span className="text-[11px] text-muted-foreground">按互动量排序</span></div>
            <div className="px-5 pb-4">
              {data.topPosts.length>0?(<div className="divide-y divide-border/40">{data.topPosts.slice(0,4).map((p,i)=>(
                <motion.div key={p.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.05}} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 group hover:bg-muted/20 -mx-2 px-2 rounded-lg transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground/40 w-4 text-center mt-0.5 tabular-nums shrink-0">{i+1}</span>
                  <Link href={`/posts/${p.id}`} className="min-w-0 flex-1"><p className="text-sm leading-relaxed line-clamp-2">{p.content}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground/50"><span className="flex items-center gap-0.5"><Heart className="size-3"/>{p.likes}</span><span className="flex items-center gap-0.5"><MessageCircle className="size-3"/>{p.comments}</span><span className="flex items-center gap-0.5"><Bookmark className="size-3"/>{p.bookmarks}</span></div>
                  </Link>
                  <div className="text-right shrink-0"><span className="text-base font-semibold tabular-nums">{p.total}</span><p className="text-[10px] text-muted-foreground/40">互动</p></div>
                </motion.div>
              ))}</div>):<Empty text="暂无帖子"/>}
            </div>
          </motion.div>

          {/* Heatmap */}
          <motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">活跃度 · 近 180 天</h3></div>
              <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground/50">少</span>{HEATMAP_SHADES.map((c,i)=>(<div key={i} className="size-[9px] rounded-[2px]" style={{backgroundColor:c}}/>))}<span className="text-[10px] text-muted-foreground/50">多</span></div>
            </div>
            <Heatmap data={data.heatmap}/>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Influence */}
          <motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-5`}>
            <div className="flex items-center gap-2 mb-4"><Award className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">影响力</h3></div>
            <div className="flex flex-col items-center">
              <div className="relative size-28"><svg className="size-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted-foreground/[0.06]" strokeWidth="5"/><motion.circle cx="50" cy="50" r="40" fill="none" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" strokeDasharray={2*Math.PI*40} initial={{strokeDashoffset:2*Math.PI*40}} animate={{strokeDashoffset:2*Math.PI*40*(1-influence.total/100)}} transition={{duration:1.5,ease:"easeOut"}}/></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold tabular-nums">{influence.total}</span><span className="text-[9px] text-muted-foreground">/100</span></div></div>
              <div className="mt-4 flex gap-5">{([{l:"内容",v:influence.content,c:ACCENT},{l:"互动",v:influence.engagement,c:"#6366f1"},{l:"学习",v:influence.learning,c:"#f59e0b"}] as const).map(s=>(<div key={s.l} className="text-center"><p className="text-sm font-semibold tabular-nums" style={{color:s.c}}>{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></div>))}</div>
            </div>
          </motion.div>

          {/* Mini rings */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div variants={fadeUp} whileHover={{y:-2,transition:{duration:0.15}}} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4 flex flex-col items-center gap-2 hover:shadow-sm transition-all`}><MiniRing value={data.overview.codePostRatio} color={ACCENT}/><span className="text-[11px] text-muted-foreground">代码帖</span></motion.div>
            <motion.div variants={fadeUp} whileHover={{y:-2,transition:{duration:0.15}}} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4 flex flex-col items-center gap-2 hover:shadow-sm transition-all`}><MiniRing value={data.quiz.passRate} color="#6366f1"/><span className="text-[11px] text-muted-foreground">通过率</span></motion.div>
          </div>

          {/* Skill radar */}
          <motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-5`}>
            <div className="flex items-center gap-2 mb-2"><Brain className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">技能雷达</h3></div>
            {data.distributions.skillRadar.length>0?(<ResponsiveContainer width="100%" height={200}><RadarChart data={data.distributions.skillRadar}><PolarGrid stroke="currentColor" className="text-muted-foreground/[0.08]"/><PolarAngleAxis dataKey="skill" tick={{fontSize:9}} className="text-muted-foreground/70"/><PolarRadiusAxis tick={false} axisLine={false} domain={[0,100]}/><Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.1} strokeWidth={1.5} dot={{r:2,fill:ACCENT,strokeWidth:0}}/></RadarChart></ResponsiveContainer>):<Empty text="暂无数据"/>}
          </motion.div>

          {/* Tool stats */}
          <motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4`}>
            <div className="flex items-center gap-2 mb-3"><BarChart3 className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">工具数据</h3></div>
            <div className="space-y-2.5">
              {([
                {icon:Trophy,label:"通过题目",value:data.quiz.uniquePassed,sub:`${data.quiz.totalSubmissions} 次提交`,href:undefined},
                {icon:NotebookPen,label:"笔记",value:data.overview.totalNotebooks,sub:`${data.overview.totalNotebookFolders} 个文件夹`,href:undefined},
                {icon:Bot,label:"AI 对话",value:data.overview.totalAiConversations,sub:`${data.overview.totalAiMessages} 条消息`,href:undefined},
                {icon:MessageCircle,label:"收到评论",value:data.overview.totalCommentsReceived,sub:undefined,href:"/analytics/comments"},
                {icon:Bookmark,label:"被收藏",value:data.overview.totalBookmarksReceived,sub:undefined,href:"/analytics/bookmarks"},
              ] as const).map(item=>{
                const row = (<div key={item.label} className={`flex items-center gap-2.5 ${item.href ? "hover:bg-muted/30 -mx-1 px-1 rounded-md cursor-pointer" : ""} py-0.5 transition-colors`}><item.icon className="size-3.5 text-muted-foreground/50 shrink-0"/><span className="text-[12px] text-muted-foreground flex-1">{item.label}</span><span className="text-[13px] font-semibold tabular-nums">{item.value}</span>{item.sub&&<span className="text-[10px] text-muted-foreground/40 ml-0.5">{item.sub}</span>}{item.href&&<ChevronRight className="size-3 text-muted-foreground/30"/>}</div>);
                return item.href ? <Link key={item.label} href={item.href}>{row}</Link> : row;
              })}
            </div>
          </motion.div>

          {/* Badges */}
          {badges.length>0&&(<motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4`}>
            <div className="flex items-center gap-2 mb-3"><Award className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">成就</h3></div>
            <div className="flex flex-wrap gap-2">{badges.map(b=>(<motion.div key={b.label} whileHover={{scale:1.05}} className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[11px]" title={b.desc}><span>{b.emoji}</span><span className="font-medium">{b.label}</span></motion.div>))}</div>
          </motion.div>)}

          {/* Tags */}
          {data.distributions.tagDistribution.length>0&&(<motion.div variants={fadeUp} className={`rounded-xl border ${SUBTLE_BORDER} bg-card p-4`}>
            <div className="flex items-center gap-2 mb-3"><Hash className="size-4 text-muted-foreground"/><h3 className="text-[13px] font-medium">热门标签</h3></div>
            <div className="flex flex-wrap gap-1.5">{data.distributions.tagDistribution.slice(0,10).map((t,i)=>(<span key={t.name} className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors"><span className="size-1.5 rounded-full shrink-0" style={{backgroundColor:PIE_PALETTE[i%PIE_PALETTE.length]}}/>#{t.name}<span className="text-[10px] text-muted-foreground/40 tabular-nums">{t.value} 篇</span></span>))}</div>
          </motion.div>)}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════ CONTENT ═══════════ */

function ContentPanel({data}:{data:AnalyticsData}) {
  const avgData=[{name:"点赞",value:parseFloat(data.overview.avgLikesPerPost),color:"#ef4444"},{name:"评论",value:parseFloat(data.overview.avgCommentsPerPost),color:"#6366f1"},{name:"收藏",value:parseFloat(data.overview.avgBookmarksPerPost),color:"#f59e0b"}];
  return (
    <motion.div initial="hidden" animate="visible" exit={{opacity:0,y:-8}} variants={stagger} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="话题标签" icon={Target}>{data.distributions.tagDistribution.length>0?(<div className="flex items-center gap-4"><ResponsiveContainer width="50%" height={240}><PieChart><Pie data={data.distributions.tagDistribution} cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2} dataKey="value" nameKey="name" stroke="none" animationDuration={800}>{data.distributions.tagDistribution.map((_,i)=>(<Cell key={i} fill={PIE_PALETTE[i%PIE_PALETTE.length]}/>))}</Pie><Tooltip content={<PieTooltipContent/>}/></PieChart></ResponsiveContainer><div className="flex-1 space-y-1.5">{data.distributions.tagDistribution.slice(0,8).map((t,i)=>(<motion.div key={t.name} initial={{opacity:0,x:6}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}} className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full shrink-0" style={{backgroundColor:PIE_PALETTE[i%PIE_PALETTE.length]}}/><span className="text-muted-foreground truncate">#{t.name}</span><span className="ml-auto font-medium tabular-nums">{t.value} 篇</span></motion.div>))}</div></div>):<Empty text="暂无标签"/>}</Card>
        <Card title="每帖平均互动" icon={Zap}><ResponsiveContainer width="100%" height={240}><BarChart data={avgData} barSize={32}><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]"/><XAxis dataKey="name" tick={{fontSize:11}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} width={28}/><Tooltip content={<ChartTooltipContent/>}/><Bar dataKey="value" name="平均值" radius={[4,4,0,0]} animationDuration={700}>{avgData.map((e,i)=>(<Cell key={i} fill={e.color} opacity={0.8}/>))}</Bar></BarChart></ResponsiveContainer></Card>
      </div>

      <Card title="最受欢迎帖子" icon={Star}>{data.topPosts.length>0?(<div className="divide-y divide-border/40">{data.topPosts.map((p,i)=>(<motion.div key={p.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.06}} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/20 -mx-2 px-2 rounded-lg transition-colors"><span className="text-xs font-medium text-muted-foreground/50 w-5 text-center tabular-nums">{i+1}</span><Link href={`/posts/${p.id}`} className="min-w-0 flex-1"><p className="text-sm truncate">{p.content}</p><div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/60"><span className="flex items-center gap-0.5"><Heart className="size-3"/>{p.likes}</span><span className="flex items-center gap-0.5"><MessageCircle className="size-3"/>{p.comments}</span><span className="flex items-center gap-0.5"><Bookmark className="size-3"/>{p.bookmarks}</span></div></Link><span className="text-sm font-semibold tabular-nums text-muted-foreground">{p.total}</span></motion.div>))}</div>):<Empty text="暂无帖子"/>}</Card>

      <Card title="互动收支" icon={TrendingUp}><div className="grid grid-cols-3 gap-4">{([{label:"点赞",icon:Heart,given:data.overview.totalLikesGiven,received:data.overview.totalLikesReceived,href:"/analytics/likes"},{label:"评论",icon:MessageCircle,given:data.overview.totalCommentsGiven,received:data.overview.totalCommentsReceived,href:"/analytics/comments"},{label:"收藏",icon:Bookmark,given:data.overview.totalBookmarksGiven,received:data.overview.totalBookmarksReceived,href:"/analytics/bookmarks"}] as const).map((item,i)=>{const diff=item.received-item.given;const DiffIcon=diff>0?ArrowUpRight:diff<0?ArrowDownRight:Minus;return(<Link key={item.label} href={item.href}><motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}} className={`rounded-lg border ${SUBTLE_BORDER} p-4 hover:bg-muted/20 transition-colors cursor-pointer`}><div className="flex items-center gap-1.5 text-muted-foreground mb-3"><item.icon className="size-3.5"/><span className="text-xs">{item.label}</span><ChevronRight className="size-3 text-muted-foreground/30 ml-auto"/></div><div className="flex items-end justify-between"><div><p className="text-lg font-semibold tabular-nums leading-none">{item.received}</p><p className="text-[10px] text-muted-foreground/60 mt-1">收到</p></div><div className="text-right"><p className="text-lg font-semibold tabular-nums leading-none text-muted-foreground/70">{item.given}</p><p className="text-[10px] text-muted-foreground/60 mt-1">发出</p></div></div><div className="mt-2.5 pt-2.5 border-t border-border/40 flex items-center gap-1 text-[11px]"><DiffIcon className={`size-3 ${diff>0?"text-emerald-500":diff<0?"text-red-400":"text-muted-foreground/40"}`}/><span className={diff>0?"text-emerald-500":diff<0?"text-red-400":"text-muted-foreground/40"}>净{diff>0?"+":""}{diff}</span></div></motion.div></Link>);})}</div></Card>
    </motion.div>
  );
}

/* ═══════════ QUIZ ═══════════ */

function QuizPanel({data}:{data:AnalyticsData}) {
  return (
    <motion.div initial="hidden" animate="visible" exit={{opacity:0,y:-8}} variants={stagger} className="space-y-6">
      <motion.div variants={stagger} className="grid grid-cols-3 gap-3"><Metric icon={Target} label="总提交" value={data.quiz.totalSubmissions}/><Metric icon={Trophy} label="通过题目" value={data.quiz.uniquePassed}/><Metric icon={Zap} label="通过率" value={`${data.quiz.passRate}%`}/></motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="难度分布" icon={Activity}>{data.quiz.difficultyDistribution.length>0?(<ResponsiveContainer width="100%" height={240}><BarChart data={data.quiz.difficultyDistribution} barSize={28}><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]"/><XAxis dataKey="difficulty" tick={{fontSize:11}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} width={28}/><Tooltip content={<ChartTooltipContent/>}/><Legend wrapperStyle={{fontSize:"11px"}} iconType="circle" iconSize={6}/><Bar dataKey="total" name="提交" radius={[4,4,0,0]} animationDuration={700}>{data.quiz.difficultyDistribution.map((e,i)=>(<Cell key={i} fill={DIFFICULTY_COLORS[e.difficulty]||"#64748b"} opacity={0.25}/>))}</Bar><Bar dataKey="passed" name="通过" radius={[4,4,0,0]} animationDuration={700}>{data.quiz.difficultyDistribution.map((e,i)=>(<Cell key={i} fill={DIFFICULTY_COLORS[e.difficulty]||"#64748b"}/>))}</Bar></BarChart></ResponsiveContainer>):<Empty text="暂无数据"/>}</Card>
        <Card title="编程语言" icon={Code2}>{data.quiz.languageDistribution.length>0?(<div className="flex items-center gap-4"><ResponsiveContainer width="50%" height={240}><PieChart><Pie data={data.quiz.languageDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name" stroke="none" animationDuration={800}>{data.quiz.languageDistribution.map((_,i)=>(<Cell key={i} fill={PIE_PALETTE[i%PIE_PALETTE.length]}/>))}</Pie><Tooltip content={<PieTooltipContent/>}/></PieChart></ResponsiveContainer><div className="flex-1 space-y-2">{data.quiz.languageDistribution.map((l,i)=>(<motion.div key={l.name} initial={{opacity:0,x:6}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full shrink-0" style={{backgroundColor:PIE_PALETTE[i%PIE_PALETTE.length]}}/><span className="text-muted-foreground">{l.name}</span><span className="ml-auto font-medium tabular-nums">{l.value}</span></motion.div>))}</div></div>):<Empty text="暂无数据"/>}</Card>
      </div>
      {data.quiz.difficultyDistribution.length>0&&(<Card title="各难度通过率" icon={Trophy}><div className="flex items-center justify-center gap-12 py-4">{data.quiz.difficultyDistribution.map(d=>(<Ring key={d.difficulty} value={d.rate} label={d.difficulty} sub={`${d.passed}/${d.total}`} color={DIFFICULTY_COLORS[d.difficulty]||"#64748b"}/>))}</div></Card>)}
      {data.quiz.recentSubmissions&&data.quiz.recentSubmissions.length>0&&(<Card title="最近提交" icon={FileText}><div className="divide-y divide-border/40">{data.quiz.recentSubmissions.map((s,i)=>(<motion.div key={s.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.04}} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"><div className={`size-1.5 rounded-full shrink-0 ${s.passed?"bg-emerald-500":"bg-red-400"}`}/><span className="text-sm truncate flex-1">{s.quizTitle}</span><span className="text-[11px] text-muted-foreground/60">{s.language}</span><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{color:DIFFICULTY_COLORS[s.difficulty==="easy"?"简单":s.difficulty==="medium"?"中等":"困难"],backgroundColor:(DIFFICULTY_COLORS[s.difficulty==="easy"?"简单":s.difficulty==="medium"?"中等":"困难"]||"#64748b")+"12"}}>{s.difficulty==="easy"?"简单":s.difficulty==="medium"?"中等":"困难"}</span></motion.div>))}</div></Card>)}
    </motion.div>
  );
}

/* ═══════════ SOCIAL ═══════════ */

function SocialPanel({data}:{data:AnalyticsData}) {
  const followRatio=data.overview.totalFollowing>0?(data.overview.totalFollowers/data.overview.totalFollowing).toFixed(2):data.overview.totalFollowers>0?"∞":"0";
  const totalReceived=data.overview.totalLikesReceived+data.overview.totalCommentsReceived+data.overview.totalBookmarksReceived;
  const totalGiven=data.overview.totalLikesGiven+data.overview.totalCommentsGiven+data.overview.totalBookmarksGiven;
  const engagementChart=[{name:"点赞",收到:data.overview.totalLikesReceived,发出:data.overview.totalLikesGiven},{name:"评论",收到:data.overview.totalCommentsReceived,发出:data.overview.totalCommentsGiven},{name:"收藏",收到:data.overview.totalBookmarksReceived,发出:data.overview.totalBookmarksGiven}];
  const influence=calcInfluence(data);
  return (
    <motion.div initial="hidden" animate="visible" exit={{opacity:0,y:-8}} variants={stagger} className="space-y-6">
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"><Metric icon={Users} label="粉丝" value={data.overview.totalFollowers}/><Metric icon={Eye} label="关注" value={data.overview.totalFollowing}/><Metric icon={TrendingUp} label="粉关比" value={followRatio}/><Metric icon={Zap} label="互动收到" value={totalReceived}/><Metric icon={Heart} label="互动发出" value={totalGiven}/></motion.div>
      {/* Follower growth */}
      {data.followerGrowth && data.followerGrowth.length > 0 && (
        <Card title="粉丝增长趋势 · 近 30 天" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.followerGrowth}>
              <defs>
                <linearGradient id="gFollower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]"/>
              <XAxis dataKey="label" tick={{fontSize:10}} tickLine={false} axisLine={false} interval={5} className="text-muted-foreground/60"/>
              <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} width={32} className="text-muted-foreground/60"/>
              <Tooltip content={<ChartTooltipContent/>}/>
              <Area type="monotone" dataKey="cumulative" name="粉丝总数" stroke="#8b5cf6" fill="url(#gFollower)" strokeWidth={1.5} dot={false} activeDot={{r:3,fill:"#8b5cf6",strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="互动收支对比" icon={BarChart3}><ResponsiveContainer width="100%" height={260}><BarChart data={engagementChart} barSize={24}><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted-foreground/[0.06]"/><XAxis dataKey="name" tick={{fontSize:11}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} width={28}/><Tooltip content={<ChartTooltipContent/>}/><Legend wrapperStyle={{fontSize:"11px"}} iconType="circle" iconSize={6}/><Bar dataKey="收到" fill={ACCENT} radius={[4,4,0,0]} animationDuration={700}/><Bar dataKey="发出" fill="#64748b" radius={[4,4,0,0]} animationDuration={700} opacity={0.5}/></BarChart></ResponsiveContainer></Card>
        <Card title="影响力指数" icon={Star}><div className="flex flex-col items-center justify-center h-[260px]"><div className="relative size-36"><svg className="size-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted-foreground/[0.06]" strokeWidth="5"/><motion.circle cx="50" cy="50" r="40" fill="none" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" strokeDasharray={2*Math.PI*40} initial={{strokeDashoffset:2*Math.PI*40}} animate={{strokeDashoffset:2*Math.PI*40*(1-influence.total/100)}} transition={{duration:1.5,ease:"easeOut"}}/></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><motion.span className="text-3xl font-semibold tabular-nums" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}}>{influence.total}</motion.span><span className="text-[10px] text-muted-foreground">/ 100</span></div></div><div className="mt-6 flex items-center gap-8">{([{label:"内容",value:influence.content,color:ACCENT},{label:"互动",value:influence.engagement,color:"#6366f1"},{label:"学习",value:influence.learning,color:"#f59e0b"}] as const).map((item,i)=>(<motion.div key={item.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:1+i*0.1}} className="text-center"><p className="text-base font-semibold tabular-nums" style={{color:item.color}}>{item.value}</p><p className="text-[10px] text-muted-foreground">{item.label}</p></motion.div>))}</div></div></Card>
      </div>
      {data.recentFollowers&&data.recentFollowers.length>0&&(<Card title="粉丝列表" icon={Users}><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{data.recentFollowers.slice(0,12).map((f,i)=>(<Link key={f.username} href={`/users/${f.username}`}><motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}} className={`flex items-center gap-2.5 rounded-lg border ${SUBTLE_BORDER} p-2.5 hover:bg-muted/30 transition-colors`}><div className="size-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium text-muted-foreground shrink-0 overflow-hidden">{f.avatarUrl?<img src={f.avatarUrl} alt="" className="size-full object-cover"/>:f.displayName.charAt(0)}</div><div className="min-w-0"><p className="text-xs font-medium truncate">{f.displayName}</p><p className="text-[10px] text-muted-foreground truncate">@{f.username}</p></div><ChevronRight className="size-3 text-muted-foreground/30 ml-auto shrink-0"/></motion.div></Link>))}</div></Card>)}
      <Card title="通知" icon={Activity}><div className="grid grid-cols-2 gap-3"><div className={`rounded-lg border ${SUBTLE_BORDER} p-4 flex items-center gap-3`}><Activity className="size-4 text-muted-foreground/50"/><div><p className="text-xl font-semibold tabular-nums leading-none">{data.overview.totalNotifications}</p><p className="text-[11px] text-muted-foreground mt-1">总通知</p></div></div><div className={`rounded-lg border ${SUBTLE_BORDER} p-4 flex items-center gap-3`}><Flame className="size-4 text-muted-foreground/50"/><div><p className="text-xl font-semibold tabular-nums leading-none">{data.overview.unreadNotifications}</p><p className="text-[11px] text-muted-foreground mt-1">未读</p></div></div></div></Card>
    </motion.div>
  );
}

/* ═══════════ Helpers ═══════════ */

function calcInfluence(data:AnalyticsData) {
  const content=Math.min(Math.round(Math.min(data.overview.totalPosts*3,40)+data.overview.codePostRatio*0.2+Math.min(data.overview.totalNotebooks*2,20)),100);
  const engagement=Math.min(Math.round(Math.min(data.overview.totalLikesReceived*2,30)+Math.min(data.overview.totalCommentsReceived*3,30)+Math.min(data.overview.totalFollowers*5,40)),100);
  const learning=Math.min(Math.round(Math.min(data.quiz.uniquePassed*5,40)+data.quiz.passRate*0.3+Math.min(data.overview.totalAiConversations*2,20)+data.overview.last7DaysActive*3),100);
  return {content,engagement,learning,total:Math.min(Math.round((content+engagement+learning)/3),100)};
}

function computeBadges(data:AnalyticsData):{emoji:string;label:string;desc:string}[] {
  const b:{emoji:string;label:string;desc:string}[]=[];
  if(data.overview.totalPosts>=10) b.push({emoji:"✍️",label:"创作达人",desc:"发布 10+ 篇帖子"});
  if(data.overview.totalPosts>=50) b.push({emoji:"🔥",label:"高产作者",desc:"发布 50+ 篇帖子"});
  if(data.overview.totalLikesReceived>=50) b.push({emoji:"💗",label:"人气之星",desc:"累计获赞 50+"});
  if(data.overview.totalFollowers>=10) b.push({emoji:"👥",label:"社交达人",desc:"拥有 10+ 粉丝"});
  if(data.quiz.uniquePassed>=5) b.push({emoji:"🏆",label:"解题高手",desc:"通过 5+ 道题目"});
  if(data.quiz.uniquePassed>=20) b.push({emoji:"🧠",label:"算法大师",desc:"通过 20+ 道题目"});
  if(data.overview.totalNotebooks>=5) b.push({emoji:"📝",label:"笔记达人",desc:"创建 5+ 篇笔记"});
  if(data.overview.totalAiConversations>=10) b.push({emoji:"🤖",label:"AI 探索者",desc:"10+ 次 AI 对话"});
  if(data.overview.codePostRatio>=50) b.push({emoji:"💻",label:"代码先锋",desc:"代码帖占比 50%+"});
  if(data.overview.last7DaysActive>=7) b.push({emoji:"⚡",label:"全勤战士",desc:"本周每天都活跃"});
  return b;
}