"use client"

import { Button } from "@/components/ui/button"
import { Bell, Bookmark, Home, Mail, Code, ClipboardList, Bot, BarChart3, NotebookPen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface MenuBarProps{
    className?: string
}

const activeClass = "bg-green-50 text-green-600 font-semibold dark:bg-green-950 dark:text-green-400"

export default function MenuBar({className}: MenuBarProps){
    const pathname = usePathname()

    return <div className={className}>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname === "/" ? activeClass : ""}`}
        title="主页"
        asChild>
            <Link href="/">
            <Home />
            <span className="hidden lg:inline">主页</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/notifications") ? activeClass : ""}`}
        title="通知"
        asChild>
            <Link href="/notifications">
            <Bell />
            <span className="hidden lg:inline">通知</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/messages") ? activeClass : ""}`}
        title="消息"
        asChild>
            <Link href="/messages">
            <Mail />
            <span className="hidden lg:inline">消息</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/bookmarks") ? activeClass : ""}`}
        title="收藏"
        asChild>
            <Link href="/bookmarks">
            <Bookmark />
            <span className="hidden lg:inline">收藏</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/code") ? activeClass : ""}`}
        title="代码"
        asChild>
            <Link href="/code">
            <Code />
            <span className="hidden lg:inline">代码</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/quiz") ? activeClass : ""}`}
        title="题库"
        asChild>
            <Link href="/quiz">
            <ClipboardList />
            <span className="hidden lg:inline">题库</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/notebook") ? activeClass : ""}`}
        title="笔记本"
        asChild>
            <Link href="/notebook">
            <NotebookPen />
            <span className="hidden lg:inline">笔记本</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/ai-assistant") ? activeClass : ""}`}
        title="AI助手"
        asChild>
            <Link href="/ai-assistant">
            <Bot />
            <span className="hidden lg:inline">AI助手</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className={`flex items-center justify-start gap-3 ${pathname.startsWith("/analytics") ? activeClass : ""}`}
        title="数据分析"
        asChild>
            <Link href="/analytics">
            <BarChart3 />
            <span className="hidden lg:inline">数据分析</span>
            </Link>
        </Button>
    </div>
}